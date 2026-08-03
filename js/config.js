const supabaseUrl = 'https://qzuguemcctrivmblzfjc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dWd1ZW1jY3RyaXZtYmx6ZmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzQ5NzQsImV4cCI6MjEwMTMxMDk3NH0.U5dgeIVnoDM0bs8SLCcxvthTlE3u1T9qTehF5xTheNo';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

window.supabaseClient = supabaseClient;
window.supabaseUrl = supabaseUrl;

const CONFIG = {
    supabase: supabaseClient,
    updateInterval: 5000,
    mqttBroker: 'wss://broker.emqx.io:8084/mqtt',
    mqttTopic: 'io/movimentojamile',  // Tópico único (igual ao ESP32)
};

window.CONFIG = CONFIG;

console.log('✅ Configurações carregadas:');
console.log('📡 MQTT Broker:', CONFIG.mqttBroker);
console.log('📡 MQTT Topic:', CONFIG.mqttTopic);