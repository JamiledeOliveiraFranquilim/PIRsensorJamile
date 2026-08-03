let mqttClient = null;
let mqttConnected = false;
let updateInterval = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando página Home...');

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            console.log('Usuário não autenticado, redirecionando para login...');
            window.location.href = 'login.html';
            return;
        }

        const userNameEl = document.querySelector('.user-name');
        if (userNameEl && session.user.user_metadata?.full_name) {
            userNameEl.textContent = session.user.user_metadata.full_name;
        } else if (userNameEl) {
            userNameEl.textContent = session.user.email;
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = 'login.html';
        return;
    }

    initializeMQTT();

    await fetchHistoricalData();

    if (updateInterval) {
        clearInterval(updateInterval);
    }
    updateInterval = setInterval(fetchHistoricalData, CONFIG.updateInterval);

    console.log('Sistema inicializado com sucesso!');
});

function showMqttStatus(message, type = 'info') {
    const mqttStatusEl = document.getElementById('mqttStatus');
    if (!mqttStatusEl) return;

    mqttStatusEl.textContent = message;
    mqttStatusEl.className = `mqtt-status ${type}`;
    mqttStatusEl.style.display = 'block';

    console.log(`MQTT Status [${type}]:`, message);
}

function initializeMQTT() {
    try {
        console.log('Inicializando conexão MQTT...');
        console.log('Broker:', CONFIG.mqttBroker);

        const topics = CONFIG.mqttTopics || [CONFIG.mqttTopic, CONFIG.mqttTopic1].filter(Boolean);
        console.log('Topics:', topics);

        if (typeof mqtt === 'undefined') {
            console.error('Biblioteca MQTT não carregada!');
            showMqttStatus('Cliente MQTT não disponível', 'error');
            return;
        }

        const clientId = 'sala-inteligente-' + Math.random().toString(16).slice(2, 10);
        mqttClient = mqtt.connect(CONFIG.mqttBroker, {
            clientId: clientId,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30 * 1000,
        });

        mqttClient.on('connect', () => {
            console.log('Conectado ao MQTT Broker!');
            mqttConnected = true;
            reconnectAttempts = 0;
            showMqttStatus('Conectado ao broker MQTT', 'success');

            topics.forEach((topic) => {
                mqttClient.subscribe(topic, { qos: 0 }, (err) => {
                    if (!err) {
                        console.log(`Inscrito no tópico: ${topic}`);
                    } else {
                        console.error(`Erro ao inscrever no tópico ${topic}:`, err);
                    }
                });
            });
        });

        mqttClient.on('message', (topic, message) => {
            try {
                const payload = message.toString();
                console.log(`Mensagem recebida [${topic}]:`, payload);

                let data = null;
                try {
                    const parsed = JSON.parse(payload);
                    data = {
                        temperatura: parsed.temperatura ?? parsed.temp ?? parsed.temperature,
                        presenca: parsed.presenca ?? parsed.presence ?? parsed.movimento ?? parsed.motion,
                    };
                } catch (e) {
                    const normalized = payload.trim();
                    if (!isNaN(normalized)) {
                        data = { temperatura: parseFloat(normalized), presenca: undefined };
                    } else if (normalized.toLowerCase() === 'true' || normalized === '1' || normalized === 'on') {
                        data = { temperatura: undefined, presenca: true };
                    } else if (normalized.toLowerCase() === 'false' || normalized === '0' || normalized === 'off') {
                        data = { temperatura: undefined, presenca: false };
                    }
                }

                if (data && (data.temperatura !== undefined || data.presenca !== undefined)) {
                    updateSensors(data);
                    saveDataToSupabase(data);

                    const updateTime = document.getElementById('updateTime');
                    if (updateTime) {
                        const now = new Date();
                        updateTime.textContent = `Última atualização: ${now.toLocaleString('pt-BR')}`;
                    }
                }
            } catch (error) {
                console.error('Erro ao processar mensagem:', error);
            }
        });

        mqttClient.on('reconnect', () => {
            console.log('Tentando reconectar ao MQTT...');
            showMqttStatus('Reconectando...', 'warning');
        });

        mqttClient.on('error', (err) => {
            console.error('Erro MQTT:', err);
            mqttConnected = false;
            showMqttStatus('Erro: ' + err.message, 'error');
        });

        mqttClient.on('close', () => {
            console.log('Conexão MQTT fechada');
            mqttConnected = false;
            showMqttStatus('Conexão MQTT fechada', 'warning');
        });

        mqttClient.on('offline', () => {
            console.log('MQTT offline');
            mqttConnected = false;
            showMqttStatus('Offline', 'warning');
        });

    } catch (error) {
        console.error('Erro ao inicializar MQTT:', error);
        showMqttStatus('Erro ao inicializar: ' + error.message, 'error');
    }
}

async function fetchHistoricalData() {
    try {
        const { data, error } = await supabaseClient
            .from('leituras')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            const ultimaLeitura = data[0];
            console.log('Última leitura do banco:', ultimaLeitura);
            updateSensors(ultimaLeitura);

            const updateTime = document.getElementById('updateTime');
            if (updateTime) {
                const date = new Date(ultimaLeitura.created_at);
                updateTime.textContent = `Última atualização: ${date.toLocaleString('pt-BR')}`;
            }
        } else {
            console.log('Nenhum dado histórico encontrado');
        }

    } catch (error) {
        console.error('Erro ao buscar dados históricos:', error);
    }
}

function updateSensors(data) {
    console.log('Atualizando sensores com:', data);

    const temperaturaValue = document.querySelector('#temperatura .value');
    const confortStatus = document.getElementById('confortStatus');

    if (temperaturaValue && data.temperatura !== undefined && data.temperatura !== null) {
        const temp = parseFloat(data.temperatura);
        if (!isNaN(temp)) {
            temperaturaValue.textContent = temp.toFixed(1);
            console.log('Temperatura atualizada:', temp.toFixed(1));

            if (confortStatus) {
                let statusClass = '';
                let statusText = '';

                if (temp < 18) {
                    statusClass = 'status-frio';
                    statusText = 'Frio - Ajustar climatização';
                } else if (temp >= 18 && temp <= 26) {
                    statusClass = 'status-confortavel';
                    statusText = 'Confortável - Temperatura ideal';
                } else {
                    statusClass = 'status-quente';
                    statusText = 'Quente - Ajustar climatização';
                }

                confortStatus.className = 'confort-status ' + statusClass;
                confortStatus.innerHTML = `<span class="status-text">${statusText}</span>`;
            }
        }
    }

    const presencaValue = document.querySelector('#presenca .value');
    const presenceDetail = document.getElementById('presenceDetail');

    if (presencaValue && data.presenca !== undefined && data.presenca !== null) {
        const presenca = data.presenca === true || data.presenca === 'true' || data.presenca === 1;

        if (presenca) {
            presencaValue.textContent = 'Sala Ocupada';
            presencaValue.className = 'value status-presence presence-ocupada';
            if (presenceDetail) {
                presenceDetail.innerHTML = '<span class="status-text" style="color: #dc3545;">Movimento detectado na sala</span>';
            }
            console.log('Presença: OCUPADA');
        } else {
            presencaValue.textContent = 'Sala Livre';
            presencaValue.className = 'value status-presence presence-livre';
            if (presenceDetail) {
                presenceDetail.innerHTML = '<span class="status-text" style="color: #28a745;">Nenhum movimento detectado</span>';
            }
            console.log('Presença: LIVRE');
        }
    }
}

async function saveDataToSupabase(data) {
    try {
        const payload = {
            temperatura: data.temperatura,
            presenca: data.presenca
        };

        if (payload.temperatura === undefined && payload.presenca === undefined) {
            console.warn('Nenhum dado válido para salvar');
            return;
        }

        if (payload.temperatura !== undefined && isNaN(payload.temperatura)) {
            console.warn('Temperatura inválida, ignorando...');
            payload.temperatura = undefined;
        }

        const { error } = await supabaseClient
            .from('leituras')
            .insert([payload]);

        if (error) throw error;
        console.log('Dados salvos no Supabase com sucesso:', payload);

    } catch (error) {
        console.error('Erro ao salvar dados no Supabase:', error);
    }
}

function generateMockData() {
    const temperatura = (Math.random() * 20 + 15).toFixed(1);
    const presenca = Math.random() > 0.5;

    return {
        temperatura: parseFloat(temperatura),
        presenca: presenca
    };
}

function insertManualData(temperatura, presenca) {
    console.log('Inserindo dados manualmente:', { temperatura, presenca });
    const data = {
        temperatura: temperatura,
        presenca: presenca
    };

    updateSensors(data);
    saveDataToSupabase(data);

    const updateTime = document.getElementById('updateTime');
    if (updateTime) {
        const now = new Date();
        updateTime.textContent = `Última atualização: ${now.toLocaleString('pt-BR')}`;
    }
}

function simulateMQTTData() {
    const data = generateMockData();
    console.log('Simulando dados MQTT:', data);

    updateSensors(data);
    saveDataToSupabase(data);

    const updateTime = document.getElementById('updateTime');
    if (updateTime) {
        const now = new Date();
        updateTime.textContent = `Última atualização: ${now.toLocaleString('pt-BR')} (Simulado)`;
    }
}

function testMQTTConnection() {
    console.log('Testando conexão MQTT...');
    console.log('Broker:', CONFIG.mqttBroker);
    console.log('Topic:', CONFIG.mqttTopic);
    console.log('Status:', mqttConnected ? 'Conectado' : 'Desconectado');

    if (mqttConnected && mqttClient) {
        const testMessage = {
            temperatura: 25.5,
            presenca: true
        };
        mqttClient.publish(CONFIG.mqttTopic, JSON.stringify(testMessage), { qos: 0 }, (err) => {
            if (err) {
                console.error('Erro ao publicar teste:', err);
            } else {
                console.log('Mensagem de teste publicada:', testMessage);
            }
        });
    } else {
        console.warn('MQTT não conectado!');
    }

    return mqttConnected;
}

window.insertManualData = insertManualData;
window.generateMockData = generateMockData;
window.simulateMQTTData = simulateMQTTData;
window.testMQTT = testMQTTConnection;