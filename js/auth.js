// ========== CONFIGURAÇÃO ==========
const supabaseUrl = 'https://seu-projeto.supabase.co';
const supabaseKey = 'sua-chave-publica';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ========== FUNÇÕES DE AUTENTICAÇÃO ==========

// Função para cadastrar usuário
async function cadastrarUsuario(nome, email, senha) {
    try {
        // 1. Criar usuário no Auth do Supabase
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: senha,
            options: {
                data: {
                    full_name: nome
                }
            }
        });

        if (authError) throw authError;

        // 2. Verificar se o usuário foi criado
        if (!authData.user) {
            throw new Error('Erro ao criar usuário');
        }

        // 3. Inserir dados adicionais na tabela usuarios
        const { error: insertError } = await supabaseClient
            .from('usuarios')
            .insert([
                {
                    id: authData.user.id,
                    nome_completo: nome,
                    email: email
                }
            ]);

        if (insertError) {
            // Se falhar ao inserir na tabela usuarios, fazer rollback
            await supabaseClient.auth.admin.deleteUser(authData.user.id);
            throw insertError;
        }

        return { success: true, user: authData.user };
    } catch (error) {
        console.error('Erro no cadastro:', error);
        return { success: false, error: error.message };
    }
}

// Função para fazer login
async function loginUsuario(email, senha) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) throw error;

        // Buscar dados adicionais do usuário
        const { data: userData, error: userError } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (userError && userError.code !== 'PGRST116') {
            // Se não encontrar na tabela usuarios, criar registro
            if (userError.code === 'PGRST116') {
                await supabaseClient
                    .from('usuarios')
                    .insert([
                        {
                            id: data.user.id,
                            nome_completo: data.user.user_metadata.full_name || 'Usuário',
                            email: data.user.email
                        }
                    ]);
            } else {
                throw userError;
            }
        }

        return { 
            success: true, 
            user: data.user,
            profile: userData || null
        };
    } catch (error) {
        console.error('Erro no login:', error);
        return { success: false, error: error.message };
    }
}

// Função para verificar sessão
async function verificarSessao() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            // Buscar dados do perfil
            const { data: userData } = await supabaseClient
                .from('usuarios')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            return { 
                authenticated: true, 
                user: session.user,
                profile: userData
            };
        }
        
        return { authenticated: false };
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        return { authenticated: false, error: error.message };
    }
}

// Função para fazer logout
async function logoutUsuario() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro no logout:', error);
        return { success: false, error: error.message };
    }
}

// ========== EVENT LISTENERS ==========

// Cadastro
document.addEventListener('DOMContentLoaded', () => {
    const cadastroForm = document.getElementById('cadastroForm');
    
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nome = document.getElementById('nome').value.trim();
            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('password').value;
            const confirmSenha = document.getElementById('confirmPassword').value;
            const messageEl = document.getElementById('message');
            
            // Validações
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
            
            // Mostrar loading
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Cadastrando...';
            btn.disabled = true;
            
            // Tentar cadastrar
            const result = await cadastrarUsuario(nome, email, senha);
            
            btn.textContent = originalText;
            btn.disabled = false;
            
            if (result.success) {
                showMessage(messageEl, 
                    '✅ Cadastro realizado com sucesso! Verifique seu e-mail para confirmar.', 
                    'success'
                );
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            } else {
                showMessage(messageEl, '❌ Erro ao cadastrar: ' + result.error, 'error');
            }
        });
    }
});

// Login
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
            
            // Mostrar loading
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Entrando...';
            btn.disabled = true;
            
            const result = await loginUsuario(email, senha);
            
            btn.textContent = originalText;
            btn.disabled = false;
            
            if (result.success) {
                showMessage(messageEl, '✅ Login realizado com sucesso!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                showMessage(messageEl, '❌ Erro ao fazer login: ' + result.error, 'error');
            }
        });
    }
});

// Logout
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

// Verificar autenticação nas páginas protegidas
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthPage = window.location.pathname.includes('login.html') || 
                      window.location.pathname.includes('cadastro.html');
    
    if (!isAuthPage) {
        const result = await verificarSessao();
        
        if (!result.authenticated) {
            window.location.href = 'login.html';
            return;
        }
        
        // Exibir nome do usuário
        const userSpan = document.querySelector('.user-name');
        if (userSpan && result.profile) {
            userSpan.textContent = result.profile.nome_completo;
        }
    }
});

// ========== FUNÇÃO AUXILIAR ==========
function showMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = 'message ' + type;
    element.style.display = 'block';
    
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// ========== FUNÇÃO PARA TESTES (console) ==========
// Para testar no console do navegador
window.testFunctions = {
    cadastrarUsuario,
    loginUsuario,
    verificarSessao,
    logoutUsuario
};