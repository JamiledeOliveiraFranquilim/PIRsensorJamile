// Configuração do Supabase
const supabaseUrl = 'https://seu-projeto.supabase.co';
const supabaseKey = 'sua-chave-publica';

// Inicialização do Supabase
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Configurações do sistema
const CONFIG = {
    supabase: supabaseClient,
    updateInterval: 5000, // Atualização a cada 5 segundos
    mqttBroker: 'wss://test.mosquitto.org:8081/mqtt',
    mqttTopic: 'sala/inteligente/dados'
};