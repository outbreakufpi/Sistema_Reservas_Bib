// Função para formatar datas
function formatarData(data) {
    return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Função para validar datas de reserva
function validarDatasReserva(dataInicio, dataFim) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const agora = new Date();

    if (inicio < agora) {
        alert('A data de início não pode ser no passado!');
        return false;
    }

    if (fim <= inicio) {
        alert('A data de término deve ser posterior à data de início!');
        return false;
    }

    return true;
}

// Função para confirmar exclusão
function confirmarExclusao(mensagem) {
    return confirm(mensagem || 'Tem certeza que deseja excluir este item?');
}

// Função para mostrar mensagens de alerta
function mostrarAlerta(mensagem, tipo = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar tooltips do Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Adicionar validação aos formulários de reserva
    const formReserva = document.querySelector('form[action="/reservas"]');
    if (formReserva) {
        formReserva.addEventListener('submit', function(e) {
            const dataInicio = document.getElementById('data_inicio').value;
            const dataFim = document.getElementById('data_fim').value;
            
            if (!validarDatasReserva(dataInicio, dataFim)) {
                e.preventDefault();
            }
        });
    }

    // Adicionar confirmação aos botões de exclusão
    const botoesExclusao = document.querySelectorAll('button[type="submit"][onclick*="confirm"]');
    botoesExclusao.forEach(botao => {
        botao.addEventListener('click', function(e) {
            if (!confirmarExclusao(this.getAttribute('data-confirm-message'))) {
                e.preventDefault();
            }
        });
    });
}); 