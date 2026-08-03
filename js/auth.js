// Verificar sessão ao carregar página
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se está na página de login ou cadastro
    const isAuthPage = window.location.pathname.includes('login.html') || 
                      window.location.pathname.includes('cadastro.html');
    
    if (!isAuthPage) {
        // Verificar autenticação
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        
        // Exibir nome do usuário
        const userEmail = session.user.email;
        const userSpan = document.querySelector('.user-email');
        if (userSpan) {
            userSpan.textContent = userEmail;
        }
    }
});

// Login
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const messageEl = document.getElementById('message');
            
            // Validar campos
            if (!email || !password) {
                showMessage(messageEl, 'Por favor, preencha todos os campos.', 'error');
                return;
            }
            
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) throw error;
                
                showMessage(messageEl, 'Login realizado com sucesso!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
                
            } catch (error) {
                showMessage(messageEl, 'Erro ao fazer login: ' + error.message, 'error');
            }
        });
    }
});

// Cadastro
document.addEventListener('DOMContentLoaded', () => {
    const cadastroForm = document.getElementById('cadastroForm');
    
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nome = document.getElementById('nome').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const messageEl = document.getElementById('message');
            
            // Validar campos
            if (!nome || !email || !password || !confirmPassword) {
                showMessage(messageEl, 'Por favor, preencha todos os campos.', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage(messageEl, 'As senhas não coincidem.', 'error');
                return;
            }
            
            if (password.length < 6) {
                showMessage(messageEl, 'A senha deve ter pelo menos 6 caracteres.', 'error');
                return;
            }
            
            try {
                // Criar usuário no Supabase Auth
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: nome
                        }
                    }
                });
                
                if (error) throw error;
                
                showMessage(messageEl, 'Cadastro realizado com sucesso! Verifique seu e-mail.', 'success');
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                
            } catch (error) {
                showMessage(messageEl, 'Erro ao cadastrar: ' + error.message, 'error');
            }
        });
    }
});

// Logout
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const { error } = await supabaseClient.auth.signOut();
                if (error) throw error;
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
                alert('Erro ao fazer logout. Tente novamente.');
            }
        });
    }
});

// Função auxiliar para mostrar mensagens
function showMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = 'message ' + type;
    element.style.display = 'block';
    
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}