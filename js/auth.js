// Verificar sessão ao carregar página
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthPage = window.location.pathname.endsWith('login.html') ||
        window.location.pathname.endsWith('cadastro.html');

    if (!isAuthPage) {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();

            if (!session) {
                window.location.href = 'login.html';
                return;
            }

            const userEmail = session.user?.email;
            const userSpan = document.querySelector('.user-email');
            if (userSpan && userEmail) {
                userSpan.textContent = userEmail;
            }
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            window.location.href = 'login.html';
            return;
        }
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const messageEl = document.getElementById('message');

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

    const cadastroForm = document.getElementById('cadastroForm');
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = document.getElementById('nome').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const messageEl = document.getElementById('message');

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

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.type = 'button';
        logoutBtn.addEventListener('click', async () => {
            try {
                if (!supabaseClient || !supabaseClient.auth) {
                    throw new Error('Supabase não foi inicializado.');
                }

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