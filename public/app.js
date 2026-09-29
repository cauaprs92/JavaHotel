const TOTAL_QUARTOS = 20;
const STORAGE_KEY = "javahotel-estado";

function estadoInicial() {
    const quartos = [];
    for (let i = 1; i <= TOTAL_QUARTOS; i++) {
        quartos.push({ numero: i, ocupado: false, hospede: null, valorConsumido: 0 });
    }
    const produtos = [
        { nomeProduto: "Agua Mineral 500ml", preco: 3.5, quantidade: 20 },
        { nomeProduto: "Refrigerante Lata", preco: 6.0, quantidade: 15 },
        { nomeProduto: "Suco de Laranja", preco: 7.0, quantidade: 10 },
        { nomeProduto: "Cerveja Long Neck", preco: 9.0, quantidade: 12 },
        { nomeProduto: "Chocolate ao Leite", preco: 5.5, quantidade: 18 },
    ];
    return { quartos, produtos };
}

function carregar() {
    try {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (salvo) return JSON.parse(salvo);
    } catch (e) { /* storage indisponivel */ }
    return estadoInicial();
}

function salvar() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(estado)); } catch (e) { /* ignora */ }
}

const estado = carregar();
const brl = (v) => v.toFixed(2).replace(".", ",");

function buscarQuarto(numero) {
    return estado.quartos.find((q) => q.numero === numero) || null;
}

function reservar(numero, nome, email, telefone) {
    const q = buscarQuarto(numero);
    if (!q) return "Quarto invalido.";
    if (q.ocupado) return `Quarto ${numero} ja esta ocupado.`;
    q.ocupado = true;
    q.hospede = { nome, email, telefone };
    q.valorConsumido = 0;
    return `Quarto ${numero} reservado com sucesso para ${nome}.`;
}

function cancelar(numero) {
    const q = buscarQuarto(numero);
    if (!q) return "Quarto invalido.";
    if (!q.ocupado) return `Quarto ${numero} ja esta livre.`;
    q.ocupado = false;
    q.hospede = null;
    q.valorConsumido = 0;
    return `Reserva do quarto ${numero} cancelada.`;
}

function registrarConsumo(numero, indice, quantidade) {
    const q = buscarQuarto(numero);
    if (!q || !q.ocupado) return "Quarto invalido ou sem hospede.";
    if (indice < 0 || indice >= estado.produtos.length) return "Produto invalido.";
    const produto = estado.produtos[indice];
    if (quantidade <= 0 || quantidade > produto.quantidade) {
        return `Quantidade invalida. Estoque disponivel: ${produto.quantidade}`;
    }
    produto.quantidade -= quantidade;
    const valor = produto.preco * quantidade;
    q.valorConsumido += valor;
    return `Consumo registrado! Valor: R$ ${brl(valor)}`;
}

function el(tag, texto, classe) {
    const e = document.createElement(tag);
    if (texto !== undefined) e.textContent = texto;
    if (classe) e.className = classe;
    return e;
}

function render() {
    const grade = document.getElementById("grade-quartos");
    grade.replaceChildren();
    for (const q of estado.quartos) {
        const div = el("div", undefined, "quarto " + (q.ocupado ? "ocupado" : "livre"));
        div.append(el("strong", String(q.numero)));
        if (q.ocupado) {
            div.append(el("span", q.hospede.nome), el("span", "R$ " + brl(q.valorConsumido)));
        } else {
            div.append(el("span", "Livre"));
        }
        grade.append(div);
    }

    const tbody = document.getElementById("tabela-produtos");
    tbody.replaceChildren();
    for (const p of estado.produtos) {
        const tr = document.createElement("tr");
        tr.append(el("td", p.nomeProduto), el("td", "R$ " + brl(p.preco)), el("td", String(p.quantidade)));
        tbody.append(tr);
    }

    const select = document.getElementById("select-produto");
    if (!select.options.length) {
        estado.produtos.forEach((p, i) => {
            const o = el("option", `${p.nomeProduto} - R$ ${p.preco}`);
            o.value = String(i);
            select.append(o);
        });
    }
}

function mostrar(mensagem) {
    const alerta = document.getElementById("alerta");
    alerta.textContent = mensagem;
    alerta.hidden = false;
    salvar();
    render();
}

function ligar(id, acao) {
    const form = document.getElementById(id);
    form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const d = Object.fromEntries(new FormData(form));
        mostrar(acao(d));
        form.reset();
    });
}

ligar("form-reservar", (d) => reservar(parseInt(d.numero, 10), d.nome, d.email, d.telefone));
ligar("form-cancelar", (d) => cancelar(parseInt(d.numero, 10)));
ligar("form-consumo", (d) => registrarConsumo(parseInt(d.numero, 10), parseInt(d.produto, 10), parseInt(d.quantidade, 10)));

render();
