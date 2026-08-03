// Variáveis para controle
let mqttClient = null;
let updateInterval = null;

// Inicializar página home
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    // Inicializar MQTT
    initializeMQTT();
    
    // Buscar dados históricos
    await fetchHistoricalData();
    
    // Atualizar dados periodicamente
    updateInterval = setInterval(fetchHistoricalData, CONFIG.updateInterval);
});

// Inicializar cliente MQTT
function initializeMQTT() {
    try {
        mqttClient = mqtt.connect(CONFIG.mqttBroker);
        
        mqttClient.on('connect', () => {
            console.log('Conectado ao MQTT Broker');
            mqttClient.subscribe(CONFIG.mqttTopic, (err) => {
                if (!err) {
                    console.log(`Inscrito no tópico: ${CONFIG.mqttTopic}`);
                }
            });
        });
        
        mqttClient.on('message', (topic, message) => {
            try {
                const data = JSON.parse(message.toString());
                console.log('Dados recebidos via MQTT:', data);
                
                // Atualizar interface com dados recebidos
                updateSensors(data);
                
                // Salvar no Supabase
                saveDataToSupabase(data);
                
            } catch (error) {
                console.error('Erro ao processar mensagem MQTT:', error);
            }
        });
        
        mqttClient.on('error', (err) => {
            console.error('Erro MQTT:', err);
            // Tentar reconectar após 5 segundos
            setTimeout(initializeMQTT, 5000);
        });
        
    } catch (error) {
        console.error('Erro ao inicializar MQTT:', error);
    }
}

// Buscar dados históricos do Supabase
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
            updateSensors(ultimaLeitura);
            
            // Atualizar hora da última leitura
            const updateTime = document.getElementById('updateTime');
            if (updateTime) {
                const date = new Date(ultimaLeitura.created_at);
                updateTime.textContent = `Última atualização: ${date.toLocaleString('pt-BR')}`;
            }
        }
        
    } catch (error) {
        console.error('Erro ao buscar dados históricos:', error);
    }
}

// Atualizar sensores na interface
function updateSensors(data) {
    // Atualizar temperatura
    const temperaturaValue = document.querySelector('#temperatura .value');
    const confortStatus = document.getElementById('confortStatus');
    
    if (temperaturaValue && data.temperatura !== undefined) {
        const temp = parseFloat(data.temperatura);
        temperaturaValue.textContent = temp.toFixed(1);
        
        // Atualizar status de conforto
        if (confortStatus) {
            let statusClass = '';
            let statusText = '';
            
            if (temp < 18) {
                statusClass = 'status-frio';
                statusText = '❄️ Frio - Ajustar climatização';
            } else if (temp >= 18 && temp <= 26) {
                statusClass = 'status-confortavel';
                statusText = '✅ Confortável - Temperatura ideal';
            } else {
                statusClass = 'status-quente';
                statusText = '🔥 Quente - Ajustar climatização';
            }
            
            confortStatus.className = 'confort-status ' + statusClass;
            confortStatus.innerHTML = `<span class="status-text">${statusText}</span>`;
        }
    }
    
    // Atualizar presença
    const presencaValue = document.querySelector('#presenca .value');
    const presenceDetail = document.getElementById('presenceDetail');
    
    if (presencaValue && data.presenca !== undefined) {
        const presenca = data.presenca === true || data.presenca === 'true' || data.presenca === 1;
        
        if (presenca) {
            presencaValue.textContent = '👤 Sala Ocupada';
            presencaValue.className = 'value status-presence presence-ocupada';
            if (presenceDetail) {
                presenceDetail.innerHTML = '<span class="status-text" style="color: #dc3545;">⚠️ Movimento detectado na sala</span>';
            }
        } else {
            presencaValue.textContent = '🫥 Sala Livre';
            presencaValue.className = 'value status-presence presence-livre';
            if (presenceDetail) {
                presenceDetail.innerHTML = '<span class="status-text" style="color: #28a745;">✅ Nenhum movimento detectado</span>';
            }
        }
    }
}

// Salvar dados no Supabase
async function saveDataToSupabase(data) {
    try {
        const { error } = await supabaseClient
            .from('leituras')
            .insert([
                {
                    temperatura: data.temperatura,
                    presenca: data.presenca
                }
            ]);
        
        if (error) throw error;
        console.log('Dados salvos no Supabase com sucesso');
        
    } catch (error) {
        console.error('Erro ao salvar dados no Supabase:', error);
    }
}

// Simulação de dados para testes (quando não houver ESP32)
function generateMockData() {
    const temperatura = (Math.random() * 20 + 15).toFixed(1); // 15-35°C
    const presenca = Math.random() > 0.5;
    
    return {
        temperatura: parseFloat(temperatura),
        presenca: presenca
    };
}

// Função para testar manualmente (inserir dados)
function insertManualData(temperatura, presenca) {
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

// Expor função para console (útil para testes)
window.insertManualData = insertManualData;
window.generateMockData = generateMockData;