const client = window.supabaseClient;

if (!client) {
    console.error('Supabase não inicializado. Verifique se js/config.js foi carregado antes de js/auth.js.');
}

async function cadastrarUsuario(nome, email, senha) {
    try {
        const emailFormatado = String(email || '').trim().toLowerCase();

        if (!emailFormatado) {
            throw new Error('E-mail inválido.');
        }

        if (!client || !client.auth) {
            throw new Error('Supabase não está disponível');
        }

        const { data, error } = await client.auth.signUp({
            email: emailFormatado,
            password: senha,
            options: {
                data: {
                    full_name: nome
                }
            }
        });

        if (error) throw error;

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Erro no cadastro:', error);

        const message = error?.message || 'Erro ao cadastrar.';

        if (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('já cadastrado') || message.toLowerCase().includes('user already')) {
            return { success: false, error: 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.' };
        }

        return { success: false, error: message };
    }
}

async function loginUsuario(email, senha) {
    try {
        if (!client || !client.auth) {
            throw new Error('Supabase não está disponível');
        }

        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) throw error;

        return {
            success: true,
            user: data.user,
            profile: null
        };
    } catch (error) {
        console.error('Erro no login:', error);
        return { success: false, error: error.message };
    }
}

async function verificarSessao() {
    try {
        if (!client || !client.auth) {
            return { authenticated: false, error: 'Supabase não está disponível' };
        }

        const { data: { session }, error } = await client.auth.getSession();

        if (error) throw error;

        if (!session) {
            return { authenticated: false };
        }

        return {
            authenticated: true,
            user: session.user,
            profile: null
        };
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        return { authenticated: false, error: error.message };
    }
}

async function logoutUsuario() {
    try {
        if (!client || !client.auth) {
            throw new Error('Supabase não está disponível');
        }

        const { error } = await client.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro no logout:', error);
        return { success: false, error: error.message };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const cadastroForm = document.getElementById('cadastroForm');

    if (cadastroForm) {
        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = document.getElementById('nome').value.trim();
            const email = document.getElementById('email').value.trim().toLowerCase();
            const senha = document.getElementById('password').value;
            const confirmSenha = document.getElementById('confirmPassword').value;
            const messageEl = document.getElementById('message');

            if (!nome || !email || !senha || !confirmSenha) {
                showMessage(messageEl, 'Por favor, preencha todos os campos.', 'error');
                return;
            }

            if (senha !== confirmSenha) {
                showMessage(messageEl, 'As senhas não coincidem.', 'error');
                return;
            }

            if (senha.length < 6) {
                showMessage(messageEl, 'A senha deve ter pelo menos 6 caracteres.', 'error');
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Cadastrando...';
            btn.disabled = true;

            const result = await cadastrarUsuario(nome, email, senha);

            btn.textContent = originalText;
            btn.disabled = false;

            if (result.success) {
                showMessage(messageEl, 'Cadastro realizado com sucesso! Verifique seu e-mail para confirmar.', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                const message = result.error || 'Erro ao cadastrar.';
                showMessage(messageEl, message, 'error');
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('password').value;
            const messageEl = document.getElementById('message');

            if (!email || !senha) {
                showMessage(messageEl, 'Por favor, preencha todos os campos.', 'error');
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Entrando...';
            btn.disabled = true;

            const result = await loginUsuario(email, senha);

            btn.textContent = originalText;
            btn.disabled = false;

            if (result.success) {
                showMessage(messageEl, 'Login realizado com sucesso!', 'success');

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                showMessage(messageEl, 'Erro ao fazer login: ' + result.error, 'error');
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const result = await logoutUsuario();
            if (result.success) {
                window.location.href = 'login.html';
            } else {
                alert('Erro ao fazer logout: ' + result.error);
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const isAuthPage = window.location.pathname.includes('login.html') ||
        window.location.pathname.includes('cadastro.html');

    if (!isAuthPage) {
        const result = await verificarSessao();

        if (!result.authenticated) {
            window.location.href = 'login.html';
            return;
        }

        const userSpan = document.querySelector('.user-name');
        if (userSpan && result.user) {
            userSpan.textContent = result.user.email;
        }
    }
});

function showMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = 'message ' + type;
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

window.testFunctions = {
    cadastrarUsuario,
    loginUsuario,
    verificarSessao,
    logoutUsuario
};