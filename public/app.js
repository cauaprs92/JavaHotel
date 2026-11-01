/* ==========================================================
   JavaHotel — telas de reservas e frigobar
   Os dados ficam no banco PostgreSQL. Este arquivo busca tudo pela
   API do servidor Java (/api/estado) e envia cada alteração para ela;
   quem valida as regras e grava no banco é o Java (HotelService).
   Cada página chama sua função pelo atributo data-page do <body>.

   Ciclo de uma reserva:
     agendada  → (check-in)              → hospedada
     hospedada → (encerrar + pagamento)  → finalizada
     agendada  → (cancelar agendamento)  → removida
   Cada reserva tem um período: entrada (check-in) e saída (check-out).
   O período vale de [entrada, saída): o dia da saída de um hóspede pode ser
   o dia de entrada do próximo. Duas reservas agendadas/hospedadas no mesmo
   quarto nunca podem ter períodos que se sobrepõem.
   ========================================================== */

const QUARTOS_POR_ANDAR = 5;
const ESTOQUE_REFERENCIA = 20;
const ESTOQUE_BAIXO = 5;
const API = "api"; // mesmo endereço do site: http://localhost:8081/api
const SEM_CONEXAO = "Sem conexão com o servidor do JavaHotel. Verifique se ele está rodando.";

// As chaves são as gravadas nos dados; os rótulos são o que aparece na tela.
const STATUS = { agendada: "Agendado", hospedada: "Hospedado", finalizada: "Finalizado" };

/* ---------- Datas (texto "AAAA-MM-DD", no fuso do navegador) ---------- */

const doisDigitos = (n) => String(n).padStart(2, "0");
const isoDoDia = (d) => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
const hoje = () => isoDoDia(new Date());
const dataValida = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso));

function somarDias(iso, dias) {
    const [a, m, d] = iso.split("-").map(Number);
    return isoDoDia(new Date(a, m - 1, d + dias));
}

const noites = (entrada, saida) => Math.round((Date.parse(saida) - Date.parse(entrada)) / 864e5);

/** "31/10", ou "31/10/27" quando o ano é outro. */
function dataCurta(iso) {
    const [a, m, d] = iso.split("-");
    return a === hoje().slice(0, 4) ? `${d}/${m}` : `${d}/${m}/${a.slice(2)}`;
}

/* ---------- Estado (vem do banco de dados) ---------- */

/**
 * Cópia do que está no banco: quartos, reservas (com hóspede, código e total do frigobar)
 * e produtos. É substituída por inteiro a cada carregarEstado().
 */
let estado = { quartos: [], reservas: [], produtos: [] };

/** Busca no servidor tudo o que as páginas mostram. Lança um Error com a mensagem do problema. */
async function carregarEstado() {
    let resposta;
    try {
        resposta = await fetch(`${API}/estado`, { cache: "no-store" });
    } catch (e) {
        throw new Error(SEM_CONEXAO);
    }
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok || !dados || !Array.isArray(dados.reservas)) {
        throw new Error((dados && dados.msg) || `O servidor respondeu com erro (${resposta.status}).`);
    }
    estado = dados;
}

/* ---------- Consultas ---------- */

const ativa = (r) => r.status !== "finalizada";
const numerosDosQuartos = () => estado.quartos.map((q) => q.numero);
const quartoValido = (n) => estado.quartos.some((q) => q.numero === n);

/** Andar do quarto, como está gravado no banco. */
function andar(numero) {
    const q = estado.quartos.find((x) => x.numero === numero);
    return q ? q.andar : Math.ceil(numero / QUARTOS_POR_ANDAR);
}
/** Andares que existem, do 1º para cima. */
const andares = () => [...new Set(estado.quartos.map((q) => q.andar))].sort((a, b) => a - b);
const buscarReserva = (id) => estado.reservas.find((r) => r.id === id) || null;
const comStatus = (status) => estado.reservas.filter((r) => r.status === status);
const porQuarto = (a, b) => a.quarto - b.quarto;
const porCodigo = (a, b) => parseInt(a.codigo, 10) - parseInt(b.codigo, 10);
const porEntrada = (a, b) => a.entrada.localeCompare(b.entrada);

/**
 * Primeira reserva ativa do quarto que se sobrepõe ao período [entrada, saída).
 * Datas em AAAA-MM-DD podem ser comparadas como texto.
 */
function conflito(numero, entrada, saida, ignorarId = null) {
    return estado.reservas.find((r) =>
        ativa(r) && r.quarto === numero && r.id !== ignorarId
        && entrada < r.saida && r.entrada < saida) || null;
}

/** Quartos sem nenhuma reserva ativa no período. */
function quartosDisponiveis(entrada, saida, ignorarId = null) {
    return numerosDosQuartos().filter((n) => !conflito(n, entrada, saida, ignorarId));
}

/**
 * Situação de cada quarto HOJE:
 *  - hospedada: tem hóspede dentro;
 *  - agendada:  tem reserva cujo período inclui hoje, ainda sem check-in;
 *  - livre:     nenhuma das duas (pode ter reservas futuras em "proximas").
 */
function quartos() {
    const dia = hoje();
    return numerosDosQuartos().map((numero) => {
        const ativas = estado.reservas.filter((r) => ativa(r) && r.quarto === numero).sort(porEntrada);
        const reserva = ativas.find((r) => r.status === "hospedada")
            || ativas.find((r) => r.status === "agendada" && r.entrada <= dia && dia < r.saida)
            || null;
        const proximas = ativas.filter((r) => r !== reserva && r.status === "agendada" && r.saida > dia);
        return { numero, reserva, proximas, situacao: reserva ? reserva.status : "livre" };
    });
}
const livres = () => quartos().filter((q) => !q.reserva);

/** Valida um período de reserva; devolve a mensagem de erro ou null. */
function erroDePeriodo(entrada, saida, exigirFuturo) {
    if (!dataValida(entrada) || !dataValida(saida)) return "Informe as datas de check-in e check-out.";
    if (saida <= entrada) return "O check-out precisa ser depois do check-in.";
    if (exigirFuturo && entrada < hoje()) return "O check-in não pode ser em uma data que já passou.";
    return null;
}

/* ---------- Alterações (enviadas para o servidor Java, que grava no banco) ---------- */

const ok = (msg) => ({ ok: true, msg });
const erro = (msg) => ({ ok: false, msg });

/**
 * Envia uma alteração para a API. O Java confere as regras (quarto livre, datas,
 * estoque...) e grava no PostgreSQL; aqui só mostramos a mensagem que ele devolve.
 * Sempre que o servidor responde, os dados são recarregados do banco, para a tela
 * ficar igual ao que está gravado (inclusive mudanças feitas por outra pessoa).
 * Devolve { ok, msg }.
 */
async function enviar(metodo, caminho, corpo) {
    let resposta;
    try {
        resposta = await fetch(`${API}/${caminho}`, {
            method: metodo,
            headers: corpo === undefined ? {} : { "Content-Type": "application/json" },
            body: corpo === undefined ? undefined : JSON.stringify(corpo),
        });
    } catch (e) {
        return erro(SEM_CONEXAO);
    }
    const dados = await resposta.json().catch(() => null);
    const resultado = dados && typeof dados.msg === "string"
        ? { ok: resposta.ok && dados.ok === true, msg: dados.msg }
        : erro(`O servidor respondeu com erro (${resposta.status}).`);
    try { await carregarEstado(); } catch (e) { /* a tela atualiza na próxima vez */ }
    return resultado;
}

/** Nova reserva com o status Agendado. */
const reservar = (numero, nome, email, telefone, entrada, saida) =>
    enviar("POST", "reservas", { quarto: numero, nome, email, telefone, entrada, saida });

const fazerCheckin = (id) => enviar("POST", `reservas/${id}/checkin`);

const cancelarAgendamento = (id) => enviar("DELETE", `reservas/${id}`);

/** Encerra a estadia. Com consumo no frigobar, o servidor exige a confirmação do pagamento. */
const finalizarReserva = (id, pagamentoConfirmado) =>
    enviar("POST", `reservas/${id}/finalizar`, { pagamentoConfirmado });

/**
 * Atualiza hóspede, quarto e datas. Com hóspede no hotel, a data de entrada não muda
 * (só dá para mudar a saída, por exemplo para estender a estadia).
 */
const editarReserva = (id, quarto, nome, email, telefone, entrada, saida) =>
    enviar("PUT", `reservas/${id}`, { quarto, nome, email, telefone, entrada, saida });

/**
 * Lança vários produtos de uma vez na reserva hospedada do quarto.
 * itens: [{ indice, quantidade }], com o índice do produto em estado.produtos.
 * O servidor confere tudo antes; se algo falhar, nada é lançado.
 */
function registrarConsumo(numero, itens) {
    return enviar("POST", "consumos", {
        quarto: numero,
        itens: itens.map(({ indice, quantidade }) => ({ produtoId: estado.produtos[indice].id, quantidade })),
    });
}

/** Apaga reservas e hóspedes do banco e restaura o estoque do frigobar. */
const redefinirDados = () => enviar("POST", "redefinir");

/* ---------- Utilidades ---------- */

// Ícones fixos (sem dados do usuário), por isso podem ir via innerHTML.
const ICONE_OLHO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONE_LIXEIRA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoDataHora = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const brl = (v) => formatoBRL.format(v);
const dataHora = (iso) => (iso ? formatoDataHora.format(new Date(iso)) : "—");
const n2 = (n) => String(n).padStart(2, "0");

/** "3 noites · 31/10 → 03/11" */
function textoEstadia(entrada, saida) {
    if (!dataValida(entrada) || !dataValida(saida) || saida <= entrada) return "Datas inválidas";
    const n = noites(entrada, saida);
    return `${n} ${n === 1 ? "noite" : "noites"} · ${dataCurta(entrada)} → ${dataCurta(saida)}`;
}
const $ = (id) => document.getElementById(id);
const parametro = (nome) => new URLSearchParams(location.search).get(nome);

function el(tag, texto, classe) {
    const e = document.createElement(tag);
    if (texto !== undefined && texto !== null) e.textContent = texto;
    if (classe) e.className = classe;
    return e;
}

function opcao(valor, texto) {
    const o = el("option", texto);
    o.value = String(valor);
    return o;
}

function seloStatus(status) {
    return el("span", STATUS[status], `selo-status ${status}`);
}

function preencherSelect(select, opcoes, vazio) {
    const atual = select.value;
    select.replaceChildren();
    if (!opcoes.length) {
        select.append(opcao("", vazio));
        select.disabled = true;
        return;
    }
    select.disabled = false;
    opcoes.forEach(([valor, texto]) => select.append(opcao(valor, texto)));
    if (opcoes.some(([valor]) => String(valor) === atual)) select.value = atual;
}

let timerToast;
function avisar(resultado) {
    let toast = $("toast");
    if (!toast) {
        toast = el("div", "", "toast");
        toast.id = "toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.append(toast);
    }
    toast.textContent = resultado.msg;
    toast.classList.toggle("erro", !resultado.ok);
    toast.classList.add("visivel");
    clearTimeout(timerToast);
    timerToast = setTimeout(() => toast.classList.remove("visivel"), 3200);
}

/** Desativa o botão enquanto espera o servidor, para o pedido não ser enviado duas vezes. */
async function aguardando(botao, acao) {
    botao.disabled = true;
    try {
        return await acao();
    } finally {
        botao.disabled = false;
    }
}

/** Liga um formulário a uma ação no servidor; limpa o formulário quando dá certo e re-renderiza. */
function ligar(form, acao, aoTerminar) {
    const botao = form.querySelector("button[type=submit]");
    let enviando = false;
    form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        if (enviando) return;
        enviando = true;
        const dados = Object.fromEntries(new FormData(form));
        const resultado = await aguardando(botao, () => acao(dados));
        enviando = false;
        avisar(resultado);
        if (resultado.ok) form.reset();
        aoTerminar(resultado);
    });
}

/* ---------- Página: Home ---------- */

function paginaInicio() {
    renderInicio();
    return renderInicio;
}

function renderInicio() {
    const qs = quartos();
    const total = qs.length;
    const reservados = qs.filter((q) => q.reserva).length;
    const hospedadas = comStatus("hospedada").sort(porQuarto);
    const agendadas = comStatus("agendada");
    const pct = Math.round((reservados / total) * 100);

    $("data-hoje").textContent = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long", day: "numeric", month: "long",
    }).format(new Date());

    $("anel").style.setProperty("--p", pct);
    $("anel-pct").textContent = pct + "%";
    $("anel").setAttribute("aria-label", `Ocupação: ${pct}%`);
    $("ocupacao-texto").replaceChildren(
        el("strong", `${reservados} de ${total}`), " quartos reservados",
        el("br"),
        `${hospedadas.length} ${hospedadas.length === 1 ? "hospedado" : "hospedados"} · `
            + `${agendadas.length} ${agendadas.length === 1 ? "agendado" : "agendados"}`,
    );

    desenharPizza();

    $("ind-livres").textContent = total - reservados;
    $("ind-hospedes").textContent = hospedadas.length;
    $("ind-agendados").textContent = agendadas.length;
    $("ind-consumo").textContent = brl(hospedadas.reduce((s, r) => s + r.valorConsumido, 0));

    const lista = $("lista-hospedes");
    lista.replaceChildren();
    if (!hospedadas.length) {
        const vazio = el("div", undefined, "vazio");
        const link = el("a", agendadas.length ? "Ver agendamentos" : "Fazer a primeira reserva", "botao");
        link.href = "reservas.html";
        vazio.append(el("p", "Nenhum hóspede no hotel agora."), link);
        lista.append(vazio);
        return;
    }
    const ul = el("ul", undefined, "lista");
    for (const r of hospedadas.slice(0, 6)) {
        const li = el("li");
        const quem = el("div");
        quem.append(el("span", r.hospede.nome, "nome"), el("span", `Reserva #${r.codigo} · saída ${dataCurta(r.saida)}`, "sub"));
        li.append(el("span", n2(r.quarto), "num"), quem, el("span", brl(r.valorConsumido), "valor"));
        ul.append(li);
    }
    lista.append(ul);
}

/* ----- Gráfico de pizza: reservas por status ----- */

const SVG_NS = "http://www.w3.org/2000/svg";
const ORDEM_PIZZA = ["agendada", "hospedada", "finalizada"]; // ordem fixa: a cor segue o status

function svgEl(tag, atributos) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, v);
    return e;
}

const formatoPct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

/** Porcentagem de cada valor sobre o total, com uma casa decimal ("28,6%"). Quantidades iguais dão o mesmo texto. */
function porcentagens(valores) {
    const total = valores.reduce((s, v) => s + v, 0);
    return valores.map((v) => formatoPct.format(total ? v / total : 0));
}

/** Anel de reservas por status, no mesmo estilo do anel de ocupação. */
function desenharPizza() {
    const caixa = $("pizza");
    const svg = $("pizza-svg");
    const legenda = $("pizza-legenda");
    const centroValor = $("pizza-centro-valor");
    const centroRotulo = $("pizza-centro-rotulo");
    const contagens = ORDEM_PIZZA.map((s) => comStatus(s).length);
    const total = contagens.reduce((s, v) => s + v, 0);
    const pcts = porcentagens(contagens);

    $("pizza-resumo").textContent = total
        ? "Reservas por status: " + ORDEM_PIZZA.map((s, i) => `${STATUS[s]} ${contagens[i]} (${pcts[i]})`).join(", ") + "."
        : "Nenhuma reserva ainda.";
    svg.replaceChildren();
    legenda.replaceChildren();

    // Centro: total de reservas; com um status em destaque, a porcentagem dele.
    function mostrarCentro(i) {
        if (i === null) {
            centroValor.textContent = String(total);
            centroRotulo.textContent = total === 1 ? "reserva" : "reservas";
        } else {
            centroValor.textContent = pcts[i];
            centroRotulo.textContent = STATUS[ORDEM_PIZZA[i]].toLowerCase();
        }
    }
    mostrarCentro(null);

    // Mesmas medidas do anel de ocupação: 180px, espessura de 18% do raio.
    const C = 100;
    const ESPESSURA = 18;
    const R = C - ESPESSURA / 2;
    svg.append(svgEl("circle", { cx: C, cy: C, r: R, class: "trilho" }));

    // Destaque: o trecho e a linha da legenda do mesmo status acendem juntos.
    function destacar(status) {
        if (status) { caixa.dataset.ativo = status; legenda.dataset.ativo = status; }
        else { delete caixa.dataset.ativo; delete legenda.dataset.ativo; }
        svg.querySelectorAll(".fatia").forEach((f) => f.classList.toggle("ativa", f.dataset.status === status));
        legenda.querySelectorAll("li").forEach((li) => li.classList.toggle("ativa", li.dataset.status === status));
        mostrarCentro(status ? ORDEM_PIZZA.indexOf(status) : null);
    }

    const segmentos = contagens.filter((n) => n > 0).length;
    const respiro = segmentos > 1 ? 0.035 : 0; // pequeno vão entre os trechos (radianos)
    const ponto = (a) => `${(C + R * Math.cos(a)).toFixed(3)} ${(C + R * Math.sin(a)).toFixed(3)}`;

    let angulo = -Math.PI / 2; // começa no topo, sentido horário
    ORDEM_PIZZA.forEach((status, i) => {
        const n = contagens[i];
        if (n > 0) {
            const fracao = n / total;
            const fim = angulo + fracao * 2 * Math.PI;
            let fatia;
            if (fracao === 1) {
                fatia = svgEl("circle", { cx: C, cy: C, r: R });
            } else {
                const a0 = angulo + respiro / 2;
                const a1 = fim - respiro / 2;
                const grande = a1 - a0 > Math.PI ? 1 : 0;
                fatia = svgEl("path", { d: `M ${ponto(a0)} A ${R} ${R} 0 ${grande} 1 ${ponto(a1)}` });
            }
            angulo = fim;
            fatia.setAttribute("class", `fatia ${status}`);
            fatia.dataset.status = status;
            fatia.addEventListener("pointerenter", () => destacar(status));
            fatia.addEventListener("pointerleave", () => destacar(null));
            svg.append(fatia);
        }

        const li = el("li");
        li.dataset.status = status;
        const nome = el("span", undefined, "pizza-nome");
        nome.append(el("i", undefined, `amostra ${status}`), STATUS[status]);
        li.append(nome, el("span", String(n), "pizza-qtd"), el("span", pcts[i], "pizza-pct"));
        li.addEventListener("pointerenter", () => destacar(status));
        li.addEventListener("pointerleave", () => destacar(null));
        legenda.append(li);
    });
}

/* ---------- Página: Quartos ---------- */

function paginaQuartos() {
    let filtro = "todos";
    const mapa = $("mapa-quartos");
    const dialogo = $("dialogo-quarto");
    const botoes = document.querySelectorAll("[data-filtro]");
    const situacaoDoFiltro = { livres: "livre", agendados: "agendada", hospedados: "hospedada" };

    botoes.forEach((b) => b.addEventListener("click", () => {
        filtro = b.dataset.filtro;
        render();
    }));

    $("fechar-dialogo").addEventListener("click", () => dialogo.close());
    dialogo.addEventListener("click", (ev) => { if (ev.target === dialogo) dialogo.close(); });

    function abrir(q) {
        $("dialogo-titulo").textContent = `Quarto ${n2(q.numero)}`;
        $("dialogo-andar").textContent = `${andar(q.numero)}º andar`;
        const dl = $("dialogo-detalhes");
        const botoesDialogo = $("dialogo-botoes");
        dl.replaceChildren();
        botoesDialogo.replaceChildren();

        const linha = (rotulo, valor) => {
            const d = el("div");
            const dd = el("dd");
            dd.append(valor);
            d.append(el("dt", rotulo), dd);
            dl.append(d);
        };
        const link = (texto, href, classe) => {
            const a = el("a", texto, classe);
            a.href = href;
            return a;
        };

        const r = q.reserva;
        if (r) {
            linha("Código da reserva", `#${r.codigo}`);
            linha("Situação", seloStatus(r.status));
            linha("Hóspede", r.hospede.nome);
            linha("Período", `${dataCurta(r.entrada)} → ${dataCurta(r.saida)}`);
            if (r.status === "hospedada") {
                linha("Consumo do frigobar", brl(r.valorConsumido));
                botoesDialogo.append(link("Lançar consumo no frigobar", `frigobar.html?quarto=${q.numero}`, "botao"));
            }
            botoesDialogo.append(link(
                r.status === "agendada" ? "Ver reserva e fazer check-in" : "Ver reserva",
                `reservas.html?reserva=${r.id}`,
                r.status === "agendada" ? "botao" : "botao contorno",
            ));
        } else {
            linha("Situação hoje", "Disponível");
            linha("Andar", `${andar(q.numero)}º`);
        }

        // Próximas reservas do quarto (o quarto pode ser reservado em outras datas).
        const lista = $("dialogo-proximas");
        lista.replaceChildren();
        $("dialogo-proximas-bloco").hidden = q.proximas.length === 0;
        for (const p of q.proximas) {
            const li = el("li");
            const a = link("", `reservas.html?reserva=${p.id}`);
            a.append(el("span", `#${p.codigo} · ${p.hospede.nome}`, "nome"), el("span", `${dataCurta(p.entrada)} → ${dataCurta(p.saida)}`, "sub"));
            li.append(a);
            lista.append(li);
        }
        botoesDialogo.append(link(r ? "Reservar em outras datas" : "Reservar este quarto",
            `reservas.html?quarto=${q.numero}`, r ? "botao contorno" : "botao"));
        dialogo.showModal();
    }

    function render() {
        const qs = quartos();
        const n = {
            todos: qs.length,
            livres: qs.filter((q) => q.situacao === "livre").length,
            agendados: qs.filter((q) => q.situacao === "agendada").length,
            hospedados: qs.filter((q) => q.situacao === "hospedada").length,
        };
        botoes.forEach((b) => {
            b.setAttribute("aria-pressed", String(b.dataset.filtro === filtro));
            b.querySelector(".contagem").textContent = n[b.dataset.filtro];
        });

        const visiveis = qs.filter((q) => filtro === "todos" || q.situacao === situacaoDoFiltro[filtro]);

        mapa.replaceChildren();
        if (!visiveis.length) {
            mapa.append(el("p", "Nenhum quarto neste filtro.", "aviso"));
            return;
        }

        for (const a of andares()) { // 1º andar em cima
            const doAndar = visiveis.filter((q) => andar(q.numero) === a);
            if (!doAndar.length) continue;

            const noAndar = qs.filter((q) => andar(q.numero) === a);
            const livresNoAndar = noAndar.filter((q) => !q.reserva).length;
            const bloco = el("section", undefined, "andar");
            const rotulo = el("div", undefined, "andar-rotulo");
            rotulo.append(el("h2", `${a}º andar`), el("span", `${livresNoAndar} de ${noAndar.length} livres`));
            const grade = el("div", undefined, "grade-quartos");

            for (const q of doAndar) grade.append(cartaoQuarto(q));
            bloco.append(rotulo, grade);
            mapa.append(bloco);
        }
    }

    function cartaoQuarto(q) {
        const r = q.reserva;
        const card = el("button", undefined, `quarto ${q.situacao}`);
        card.type = "button";
        card.setAttribute("aria-label", r
            ? `Quarto ${q.numero}, ${STATUS[r.status].toLowerCase()}, ${r.hospede.nome}`
            : `Quarto ${q.numero}, livre`);

        const topo = el("div", undefined, "quarto-topo");
        topo.append(el("span", n2(q.numero), "quarto-num"), el("i", undefined, `ponto ${q.situacao}`));

        const info = el("div", undefined, "quarto-info");
        const proxima = q.proximas[0];
        if (!r) {
            info.append(el("span", "Disponível", "nome"),
                el("span", proxima ? `Próxima reserva ${dataCurta(proxima.entrada)}` : "Pronto para reservar", "sub"));
        } else if (r.status === "agendada") {
            info.append(el("span", r.hospede.nome, "nome"), el("span", "Check-in pendente", "sub"));
        } else {
            info.append(el("span", r.hospede.nome, "nome"), el("span", `Saída ${dataCurta(r.saida)}`, "sub"));
        }

        card.append(topo, info);
        card.addEventListener("click", () => abrir(q));
        return card;
    }

    render();
    return render;
}

/* ---------- Página: Reservas ---------- */

function paginaReservas() {
    const formReservar = $("form-reservar");
    const selLivre = $("sel-quarto-livre");
    const lista = $("lista-reservas");
    const dialogo = $("dialogo-reserva");
    const painelEditar = $("painel-editar");
    const painelConfirmar = $("painel-confirmar");
    const formEditar = $("form-editar");
    const selEditarQuarto = $("editar-quarto");
    const botaoPerigo = $("acao-perigo");
    const pagamentoOk = $("pagamento-ok");
    const botaoConfirmar = $("confirmar-acao");

    let aberta = null;            // id da reserva aberta no diálogo
    let acaoPendente = null;      // "finalizar" | "cancelar"
    let confirmacaoVeioDaEdicao = false;

    const fecharDialogo = () => dialogo.close();
    $("fechar-reserva").addEventListener("click", fecharDialogo);
    dialogo.addEventListener("click", (ev) => { if (ev.target === dialogo) fecharDialogo(); });
    dialogo.addEventListener("close", () => { aberta = null; acaoPendente = null; });

    function mostrarPainel(qual) {
        painelEditar.hidden = qual !== "editar";
        painelConfirmar.hidden = qual !== "confirmar";
    }

    /* ----- Diálogo: ver / editar ----- */

    function abrirReserva(r) {
        aberta = r.id;
        const finalizada = r.status === "finalizada";

        $("reserva-sobretitulo").textContent = `Reserva #${r.codigo} · Quarto ${n2(r.quarto)} · ${andar(r.quarto)}º andar`;
        $("reserva-titulo").textContent = finalizada ? "Detalhes da reserva" : "Editar reserva";
        $("reserva-selo").replaceChildren(seloStatus(r.status));

        // Faixa com a situação da reserva (e o check-in, quando agendada).
        const faixa = $("reserva-faixa");
        faixa.className = `faixa-status ${r.status}`;
        const antesDaEntrada = r.status === "agendada" && hoje() < r.entrada;
        $("reserva-faixa-texto").textContent = {
            agendada: antesDaEntrada
                ? `Check-in a partir de ${dataCurta(r.entrada)}. Reserva feita em ${dataHora(r.criadaEm)}.`
                : `Aguardando a chegada do hóspede. Check-in previsto para ${dataCurta(r.entrada)}.`,
            hospedada: `Hóspede no hotel desde ${dataHora(r.checkinEm)}. Saída prevista para ${dataCurta(r.saida)}.`,
            finalizada: `Finalizado em ${dataHora(r.finalizadaEm)}. Frigobar pago: ${brl(r.valorConsumido)}.`,
        }[r.status];
        const botaoCheckin = $("fazer-checkin");
        botaoCheckin.hidden = r.status !== "agendada";
        botaoCheckin.disabled = antesDaEntrada;

        const campos = formEditar.elements;
        campos.nome.value = r.hospede.nome;
        campos.email.value = r.hospede.email;
        campos.telefone.value = r.hospede.telefone;
        campos.entrada.value = r.entrada;
        campos.saida.value = r.saida;
        [campos.nome, campos.email, campos.telefone, campos.saida, selEditarQuarto].forEach((c) => { c.disabled = finalizada; });
        // Depois do check-in, a data de entrada fica fixa.
        campos.entrada.disabled = r.status !== "agendada";
        campos.entrada.min = r.entrada < hoje() ? r.entrada : hoje();
        campos.saida.min = somarDias(r.entrada, 1);
        selEditarQuarto.replaceChildren(); // começa do quarto desta reserva
        atualizarQuartosEdicao(r);
        $("editar-noites").textContent = textoEstadia(r.entrada, r.saida);

        $("editar-consumo-rotulo").textContent = finalizada ? "Frigobar pago" : "Consumo do frigobar";
        $("editar-consumo").textContent = brl(r.valorConsumido);

        $("acoes-edicao").hidden = finalizada;
        $("acao-perigo-texto").textContent = r.status === "agendada" ? "Cancelar agendamento" : "Encerrar reserva";

        mostrarPainel("editar");
        if (!dialogo.open) dialogo.showModal();
        if (!finalizada) campos.nome.focus();
    }

    /** Quarto atual + quartos livres no período escolhido na edição. */
    function atualizarQuartosEdicao(r) {
        const campos = formEditar.elements;
        const entrada = campos.entrada.value || r.entrada;
        const saida = campos.saida.value || r.saida;
        const atual = selEditarQuarto.value || String(r.quarto);
        selEditarQuarto.replaceChildren(opcao(r.quarto, `Quarto ${n2(r.quarto)}${r.status === "finalizada" ? "" : " · atual"}`));
        if (r.status !== "finalizada" && saida > entrada) {
            for (const n of quartosDisponiveis(entrada, saida, r.id)) {
                if (n !== r.quarto) selEditarQuarto.append(opcao(n, `Quarto ${n2(n)} · ${andar(n)}º andar`));
            }
        }
        selEditarQuarto.value = [...selEditarQuarto.options].some((o) => o.value === atual) ? atual : String(r.quarto);
    }

    // Mudou a data na edição: ajusta o mínimo da saída e a lista de quartos.
    ["entrada", "saida"].forEach((nome) => formEditar.elements[nome].addEventListener("change", () => {
        const r = buscarReserva(aberta);
        if (!r) return;
        const campos = formEditar.elements;
        if (campos.entrada.value) {
            campos.saida.min = somarDias(campos.entrada.value, 1);
            if (campos.saida.value <= campos.entrada.value) campos.saida.value = somarDias(campos.entrada.value, 1);
        }
        $("editar-noites").textContent = textoEstadia(campos.entrada.value, campos.saida.value);
        atualizarQuartosEdicao(r);
    }));

    formEditar.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const id = aberta;
        if (id === null) return;
        const d = Object.fromEntries(new FormData(formEditar));
        const atual = buscarReserva(id);
        // Depois do check-in o campo de entrada fica desativado e não vem no formulário.
        const entrada = d.entrada || (atual ? atual.entrada : "");
        const r = await aguardando(formEditar.querySelector("button[type=submit]"), () =>
            editarReserva(id, parseInt(d.numero, 10), d.nome.trim(), d.email.trim(), d.telefone.trim(), entrada, d.saida));
        avisar(r);
        render();
        if (r.ok) fecharDialogo();
    });

    $("fazer-checkin").addEventListener("click", async () => {
        const id = aberta;
        const r = await aguardando($("fazer-checkin"), () => fazerCheckin(id));
        avisar(r);
        render();
        // Continua aberta, agora como hospedada (ou com os dados atuais, se deu erro).
        const atualizada = buscarReserva(id);
        if (atualizada && dialogo.open && aberta === id) abrirReserva(atualizada);
    });

    /* ----- Diálogo: confirmação (encerrar com pagamento ou cancelar agendamento) ----- */

    function pedirConfirmacao(r, veioDaEdicao) {
        aberta = r.id;
        confirmacaoVeioDaEdicao = veioDaEdicao;
        acaoPendente = r.status === "agendada" ? "cancelar" : "finalizar";
        const codigo = el("strong", `#${r.codigo}`);
        const quarto = el("strong", n2(r.quarto));
        const nome = el("strong", r.hospede.nome);

        if (acaoPendente === "cancelar") {
            $("confirmar-titulo").textContent = "Cancelar agendamento?";
            $("confirmar-texto").replaceChildren(
                "A reserva ", codigo, " de ", nome, " no quarto ", quarto,
                " será apagada e o quarto ficará livre. Não dá para desfazer.",
            );
            $("confirmar-pagamento").hidden = true;
            botaoConfirmar.textContent = "Cancelar agendamento";
            botaoConfirmar.disabled = false;
        } else {
            $("confirmar-titulo").textContent = "Encerrar reserva?";
            $("confirmar-texto").replaceChildren(
                "A reserva ", codigo, " de ", nome, " no quarto ", quarto,
                " será encerrada com o status Finalizado e o quarto ficará livre.",
            );
            const temConsumo = r.valorConsumido > 0;
            $("confirmar-pagamento").hidden = false;
            $("pagamento-valor").textContent = brl(r.valorConsumido);
            $("pagamento-rotulo").textContent = temConsumo ? "Frigobar a pagar" : "Frigobar";
            $("pagamento-checagem").hidden = !temConsumo;
            $("pagamento-sem-consumo").hidden = temConsumo;
            pagamentoOk.checked = false;
            botaoConfirmar.textContent = "Finalizar reserva";
            botaoConfirmar.disabled = temConsumo;
        }

        mostrarPainel("confirmar");
        if (!dialogo.open) dialogo.showModal();
        $("confirmar-voltar").focus();
    }

    pagamentoOk.addEventListener("change", () => { botaoConfirmar.disabled = !pagamentoOk.checked; });

    botaoPerigo.addEventListener("click", () => {
        const r = buscarReserva(aberta);
        if (r && ativa(r)) pedirConfirmacao(r, true);
    });

    $("confirmar-voltar").addEventListener("click", () => {
        const r = buscarReserva(aberta);
        if (!confirmacaoVeioDaEdicao || !r) return fecharDialogo();
        abrirReserva(r);
        botaoPerigo.focus();
    });

    botaoConfirmar.addEventListener("click", async () => {
        const id = aberta;
        if (id === null) return;
        const cancelar = acaoPendente === "cancelar";
        const pago = pagamentoOk.checked;
        const r = await aguardando(botaoConfirmar, () => (cancelar ? cancelarAgendamento(id) : finalizarReserva(id, pago)));
        avisar(r);
        render();
        if (r.ok) fecharDialogo();
        // Se deu erro, o botão volta ao estado da caixa de pagamento.
        else if (!cancelar) botaoConfirmar.disabled = $("pagamento-checagem").hidden ? false : !pagamentoOk.checked;
    });

    /* ----- Lista de reservas ----- */

    function cartaoReserva(r) {
        // O card todo abre a reserva com o mouse; pelo teclado, o botão do olho faz o mesmo.
        const cartao = el("article", undefined, `reserva ${r.status}`);
        cartao.id = `reserva-${r.id}`;

        // O código da reserva é o destaque do card; o quarto vai para o rodapé.
        const num = el("span", undefined, "reserva-num");
        num.append(el("small", "Código"), `#${r.codigo}`);

        const quem = el("span", undefined, "reserva-quem");
        const titulo = el("span", undefined, "reserva-titulo");
        titulo.append(el("span", r.hospede.nome, "reserva-nome"), seloStatus(r.status));
        quem.append(
            titulo,
            el("span", r.hospede.email, "reserva-contato"),
            el("span", r.hospede.telefone, "reserva-contato"),
        );

        const acoes = el("span", undefined, "reserva-acoes");
        const botaoIcone = (icone, classe, rotulo, dica, acao) => {
            const b = el("button", undefined, classe);
            b.type = "button";
            b.title = dica;
            b.setAttribute("aria-label", rotulo);
            b.innerHTML = icone;
            b.addEventListener("click", (ev) => {
                ev.stopPropagation(); // não dispara o clique do card
                acao();
            });
            return b;
        };
        acoes.append(botaoIcone(ICONE_OLHO, "icone-botao", `Ver a reserva #${r.codigo} (${r.hospede.nome})`,
            "Ver reserva", () => abrirReserva(r)));
        if (ativa(r)) {
            const dica = r.status === "agendada" ? "Cancelar agendamento" : "Encerrar reserva";
            acoes.append(botaoIcone(ICONE_LIXEIRA, "icone-botao perigo", `${dica}: reserva #${r.codigo} (${r.hospede.nome})`,
                dica, () => pedirConfirmacao(r, false)));
        }

        const rodape = el("span", undefined, "reserva-rodape");
        let direita;
        if (r.status === "agendada") {
            direita = el("span", "Check-in pendente");
        } else {
            direita = el("span", r.status === "finalizada" ? "Frigobar pago " : "Frigobar ");
            direita.append(el("strong", brl(r.valorConsumido)));
        }
        const local = el("span", "Quarto ");
        local.append(el("strong", n2(r.quarto)), ` · ${dataCurta(r.entrada)} → ${dataCurta(r.saida)}`);
        rodape.append(local, direita);

        cartao.append(num, quem, acoes, rodape);
        cartao.addEventListener("click", () => abrirReserva(r));
        return cartao;
    }

    /* ----- Nova reserva: as datas definem quais quartos aparecem ----- */

    const novaEntrada = formReservar.elements.entrada;
    const novaSaida = formReservar.elements.saida;
    let quartoPreferido = null; // vindo do mapa de quartos (?quarto=N)

    function datasPadrao() {
        novaEntrada.value = hoje();
        novaSaida.value = somarDias(hoje(), 1);
    }

    function atualizarNovaReserva() {
        novaEntrada.min = hoje();
        if (dataValida(novaEntrada.value)) {
            novaSaida.min = somarDias(novaEntrada.value, 1);
            if (!dataValida(novaSaida.value) || novaSaida.value <= novaEntrada.value) {
                novaSaida.value = somarDias(novaEntrada.value, 1);
            }
        }
        const entrada = novaEntrada.value;
        const saida = novaSaida.value;
        const periodoOk = !erroDePeriodo(entrada, saida, true);
        const disponiveis = periodoOk ? quartosDisponiveis(entrada, saida) : [];

        preencherSelect(selLivre,
            disponiveis.map((n) => [n, `Quarto ${n2(n)} · ${andar(n)}º andar`]),
            periodoOk ? "Nenhum quarto livre nessas datas" : "Escolha datas válidas");
        if (quartoPreferido && disponiveis.includes(quartoPreferido)) selLivre.value = String(quartoPreferido);
        formReservar.querySelector("button[type=submit]").disabled = selLivre.disabled;

        $("nova-estadia").textContent = periodoOk
            ? `${textoEstadia(entrada, saida)} · ${disponiveis.length} ${disponiveis.length === 1 ? "quarto livre" : "quartos livres"}`
            : erroDePeriodo(entrada, saida, true);
    }

    [novaEntrada, novaSaida].forEach((c) => c.addEventListener("change", atualizarNovaReserva));

    /** Primeiro dia (a partir de hoje) em que o quarto está livre por pelo menos uma noite. */
    function primeiroDiaLivre(numero) {
        let dia = hoje();
        for (let i = 0; i < 730; i++, dia = somarDias(dia, 1)) {
            if (!conflito(numero, dia, somarDias(dia, 1))) return dia;
        }
        return hoje();
    }

    function render(resultado) {
        if (resultado && resultado.ok) quartoPreferido = null;
        if (!dataValida(novaEntrada.value)) datasPadrao(); // o reset do formulário limpa as datas
        atualizarNovaReserva();
        renderLista();
    }

    /* ----- Abas de status, busca e filtros ----- */

    let filtroStatus = "ativas";
    const abas = document.querySelectorAll("[data-status]");
    const busca = $("busca-reservas");
    const filtroAndar = $("filtro-andar");
    const filtroFrigobar = $("filtro-frigobar");
    const filtroOrdem = $("filtro-ordem");
    const barraFiltros = document.querySelector(".filtros-reservas");
    const barraAbas = document.querySelector(".abas-status");

    for (const a of andares()) filtroAndar.append(opcao(a, `${a}º andar`));

    abas.forEach((b) => b.addEventListener("click", () => {
        filtroStatus = b.dataset.status;
        renderLista();
    }));

    // Minúsculas e sem acento, para "joao" achar "João".
    const normalizar = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const soDigitos = (t) => String(t).replace(/\D/g, "");

    function combinaBusca(r, termo) {
        if (!termo) return true;
        // Começando com "#", procura só pelo código da reserva.
        if (termo.startsWith("#")) {
            const cod = soDigitos(termo);
            return cod !== "" && parseInt(cod, 10) === parseInt(r.codigo, 10);
        }
        const texto = normalizar([`#${r.codigo}`, r.hospede.nome, r.hospede.email, r.hospede.telefone].join(" "));
        if (texto.includes(normalizar(termo))) return true;
        const digitos = soDigitos(termo);
        if (!digitos) return false;
        // Código da reserva ("7", "0007" ou "#0007"), número do quarto ou trecho do telefone.
        const n = parseInt(digitos, 10);
        return n === parseInt(r.codigo, 10) || n === r.quarto || soDigitos(r.hospede.telefone).includes(digitos);
    }

    function doStatus(status) {
        if (status === "ativas") return estado.reservas.filter(ativa);
        if (status === "todas") return estado.reservas.slice();
        return comStatus(status);
    }

    function renderLista() {
        const todas = estado.reservas;
        const plural = (n) => (n === 1 ? "1 reserva" : `${n} reservas`);

        abas.forEach((b) => {
            b.setAttribute("aria-pressed", String(b.dataset.status === filtroStatus));
            b.querySelector(".contagem").textContent = doStatus(b.dataset.status).length;
        });
        barraAbas.hidden = barraFiltros.hidden = todas.length === 0;

        if (!todas.length) {
            $("total-reservas").textContent = plural(0);
            const vazio = el("div", undefined, "vazio");
            vazio.append(el("p", "Nenhuma reserva ainda. As novas reservas aparecem aqui com o status Agendado."));
            vazio.firstChild.style.margin = "0";
            lista.replaceChildren(vazio);
            return;
        }

        const base = doStatus(filtroStatus);
        const termo = busca.value.trim();
        const andarEscolhido = parseInt(filtroAndar.value, 10);
        const frigobar = filtroFrigobar.value;
        const filtrando = Boolean(termo || andarEscolhido || frigobar);

        const visiveis = base.filter((r) =>
            combinaBusca(r, termo)
            && (!andarEscolhido || andar(r.quarto) === andarEscolhido)
            && (frigobar !== "com" || r.valorConsumido > 0)
            && (frigobar !== "sem" || r.valorConsumido === 0));

        if (filtroOrdem.value === "nome") {
            visiveis.sort((a, b) => a.hospede.nome.localeCompare(b.hospede.nome, "pt-BR"));
        } else if (filtroOrdem.value === "consumo") {
            visiveis.sort((a, b) => b.valorConsumido - a.valorConsumido || a.quarto - b.quarto);
        } else {
            visiveis.sort(porCodigo); // padrão: pelo código da reserva
        }

        $("total-reservas").textContent = visiveis.length === base.length
            ? plural(base.length)
            : `${visiveis.length} de ${plural(base.length)}`;

        if (!visiveis.length) {
            const vazio = el("div", undefined, "vazio");
            if (filtrando) {
                const limpar = el("button", "Limpar filtros", "botao contorno");
                limpar.type = "button";
                limpar.addEventListener("click", limparFiltros);
                vazio.append(el("p", "Nenhuma reserva encontrada com esses filtros."), limpar);
            } else {
                const texto = {
                    ativas: "Nenhuma reserva em andamento no momento.",
                    agendada: "Nenhuma reserva com status Agendado.",
                    hospedada: "Nenhum hóspede no hotel agora.",
                    finalizada: "Nenhuma reserva com status Finalizado ainda.",
                }[filtroStatus] || "Nenhuma reserva.";
                vazio.append(el("p", texto));
                vazio.firstChild.style.margin = "0";
            }
            lista.replaceChildren(vazio);
            return;
        }
        lista.replaceChildren(...visiveis.map(cartaoReserva));
    }

    function limparFiltros() {
        busca.value = "";
        filtroAndar.value = "";
        filtroFrigobar.value = "";
        filtroOrdem.value = "codigo";
        renderLista();
        busca.focus();
    }

    busca.addEventListener("input", renderLista);
    busca.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && busca.value) { busca.value = ""; renderLista(); } });
    [filtroAndar, filtroFrigobar, filtroOrdem].forEach((s) => s.addEventListener("change", renderLista));

    ligar(formReservar, (d) => reservar(parseInt(d.numero, 10), d.nome.trim(), d.email.trim(), d.telefone.trim(),
        d.entrada, d.saida), render);

    datasPadrao();
    render();

    // Vindo do mapa de quartos:
    //  ?reserva=ID abre a reserva;  ?quarto=N prepara uma nova reserva nesse quarto,
    //  já na primeira data em que ele está livre.
    const pedidoReserva = buscarReserva(parseInt(parametro("reserva"), 10));
    const pedidoQuarto = parseInt(parametro("quarto"), 10);
    if (pedidoReserva) {
        if (!ativa(pedidoReserva)) document.querySelector('[data-status="todas"]').click();
        abrirReserva(pedidoReserva);
    } else if (quartoValido(pedidoQuarto)) {
        quartoPreferido = pedidoQuarto;
        const dia = primeiroDiaLivre(pedidoQuarto);
        novaEntrada.value = dia;
        novaSaida.value = somarDias(dia, 1);
        atualizarNovaReserva();
        formReservar.elements.nome.focus();
    }
    return render;
}

/* ---------- Página: Frigobar ---------- */

function paginaFrigobar() {
    const form = $("form-consumo");
    const selQuarto = $("sel-quarto-consumo");
    const listaProdutos = $("lista-produtos-consumo");
    const botaoLancar = form.querySelector("button[type=submit]");
    const aviso = $("aviso-sem-hospede");

    const selAdicionar = $("sel-adicionar");

    // Produtos adicionados a este lançamento, na ordem em que foram escolhidos.
    let itens = [];
    let semHospede = false;

    function atualizarResumo() {
        let total = 0;
        let unidades = 0;
        for (const { indice, quantidade } of itens) {
            total += estado.produtos[indice].preco * quantidade;
            unidades += quantidade;
        }
        $("resumo-total").textContent = brl(total);
        $("resumo-itens").textContent = unidades === 0
            ? "Nenhum produto adicionado"
            : `${unidades} ${unidades === 1 ? "item" : "itens"} a lançar`;
        botaoLancar.disabled = semHospede || unidades === 0;
    }

    /** Monta a caixa "Adicionar produto" só com o que ainda não foi adicionado e tem estoque. */
    function atualizarSeletor() {
        const disponiveis = estado.produtos
            .map((p, i) => [p, i])
            .filter(([p, i]) => p.quantidade > 0 && !itens.some((it) => it.indice === i));

        selAdicionar.replaceChildren(opcao("", itens.length ? "+ Adicionar outro produto" : "+ Adicionar produto"));
        for (const [p, i] of disponiveis) {
            selAdicionar.append(opcao(i, `${p.nomeProduto} · ${brl(p.preco)}`));
        }
        selAdicionar.value = "";
        selAdicionar.disabled = semHospede;
        selAdicionar.parentElement.hidden = disponiveis.length === 0;
    }

    function cartaoProduto(item) {
        const p = estado.produtos[item.indice];
        const cartao = el("div", undefined, "produto-linha ativo");

        const info = el("div", undefined, "produto-info");
        info.append(el("span", p.nomeProduto, "nome"));
        const sub = el("span", undefined, "sub");
        info.append(sub);

        const contador = el("div", undefined, "contador");
        const menos = el("button", "−");
        const mais = el("button", "+");
        const campo = el("input");
        menos.type = mais.type = "button";
        menos.setAttribute("aria-label", `Tirar um ${p.nomeProduto}`);
        mais.setAttribute("aria-label", `Adicionar um ${p.nomeProduto}`);
        campo.type = "number";
        campo.min = "1";
        campo.max = String(p.quantidade);
        campo.inputMode = "numeric";
        campo.setAttribute("aria-label", `Quantidade de ${p.nomeProduto}`);

        const remover = el("button", "×", "remover");
        remover.type = "button";
        remover.setAttribute("aria-label", `Remover ${p.nomeProduto}`);
        remover.addEventListener("click", () => {
            itens = itens.filter((it) => it !== item);
            cartao.remove();
            atualizarSeletor();
            atualizarResumo();
            selAdicionar.focus();
        });

        function definir(n) {
            item.quantidade = Math.max(1, Math.min(p.quantidade, Number.isFinite(n) ? Math.floor(n) : 1));
            campo.value = String(item.quantidade);
            sub.textContent = `${brl(p.preco)} · ${p.quantidade} em estoque · subtotal ${brl(p.preco * item.quantidade)}`;
            menos.disabled = semHospede || item.quantidade <= 1;
            mais.disabled = semHospede || item.quantidade >= p.quantidade;
            campo.disabled = remover.disabled = semHospede;
            atualizarResumo();
        }

        menos.addEventListener("click", () => definir(item.quantidade - 1));
        mais.addEventListener("click", () => definir(item.quantidade + 1));
        campo.addEventListener("input", () => {
            if (campo.value !== "") definir(parseInt(campo.value, 10));
        });
        campo.addEventListener("blur", () => definir(parseInt(campo.value, 10)));

        contador.append(menos, campo, mais);
        cartao.append(info, contador, remover);
        definir(item.quantidade);
        return cartao;
    }

    selAdicionar.addEventListener("change", () => {
        if (selAdicionar.value === "") return;
        const item = { indice: parseInt(selAdicionar.value, 10), quantidade: 1 };
        itens.push(item);
        listaProdutos.append(cartaoProduto(item));
        atualizarSeletor();
        atualizarResumo();
    });

    function render(resultado) {
        if (resultado && resultado.ok) itens = [];
        // Se o estoque mudou, tira o que esgotou.
        itens = itens.filter((it) => estado.produtos[it.indice] && estado.produtos[it.indice].quantidade > 0);

        // Só quartos com hóspede no hotel (reserva hospedada) recebem consumo.
        preencherSelect(selQuarto,
            comStatus("hospedada").sort(porQuarto).map((r) => [r.quarto, `Quarto ${n2(r.quarto)} · ${r.hospede.nome}`]),
            "Nenhum hóspede no hotel");
        semHospede = selQuarto.disabled;
        aviso.hidden = !semHospede;

        listaProdutos.replaceChildren(...itens.map(cartaoProduto));
        atualizarSeletor();
        atualizarResumo();

        const ul = $("lista-estoque");
        ul.replaceChildren();
        for (const p of estado.produtos) {
            const li = el("li");
            const linha = el("div", undefined, "estoque-linha");
            linha.append(el("span", p.nomeProduto, "estoque-nome"), el("span", brl(p.preco), "estoque-preco"));

            const baixo = p.quantidade <= ESTOQUE_BAIXO;
            const barra = el("div", undefined, "barra" + (baixo ? " baixo" : ""));
            const preenchido = el("span");
            preenchido.style.width = Math.min(100, (p.quantidade / ESTOQUE_REFERENCIA) * 100) + "%";
            barra.append(preenchido);

            const linhaBarra = el("div", undefined, "estoque-barra");
            linhaBarra.append(barra, el("span", `${p.quantidade} un.`, "estoque-qtd"));
            li.append(linha, linhaBarra);
            if (baixo) {
                const selo = el("span", p.quantidade ? "Estoque baixo" : "Esgotado", "selo alerta");
                selo.style.marginTop = "10px";
                li.append(selo);
            }
            ul.append(li);
        }
        $("total-itens").textContent = estado.produtos.reduce((s, p) => s + p.quantidade, 0) + " itens";
    }

    // Depois de lançar, continua no mesmo quarto (o reset do formulário voltaria ao primeiro).
    let ultimoQuarto = "";
    form.addEventListener("submit", () => { ultimoQuarto = selQuarto.value; });
    ligar(form, (d) => registrarConsumo(parseInt(d.numero, 10), itens), (resultado) => {
        render(resultado);
        if ([...selQuarto.options].some((o) => o.value === ultimoQuarto)) selQuarto.value = ultimoQuarto;
    });

    render();

    const pedido = parametro("quarto");
    if (pedido && [...selQuarto.options].some((o) => o.value === pedido)) selQuarto.value = pedido;
    return render;
}

/* ---------- Inicialização ---------- */

// Cada página monta a tela e devolve a função que a redesenha com dados novos.
const paginas = {
    inicio: paginaInicio,
    quartos: paginaQuartos,
    reservas: paginaReservas,
    frigobar: paginaFrigobar,
};

/** Sem dados do banco, a página mostra só o aviso e um botão para tentar de novo. */
function mostrarFalha(mensagem) {
    const container = document.querySelector("main .container");
    for (const filho of container.children) filho.hidden = true;
    const caixa = el("div", undefined, "vazio falha-conexao");
    caixa.setAttribute("role", "alert");
    const tentar = el("button", "Tentar novamente", "botao");
    tentar.type = "button";
    tentar.addEventListener("click", () => location.reload());
    caixa.append(el("p", "Não foi possível carregar os dados do banco de dados.", "falha-titulo"), el("p", mensagem), tentar);
    container.prepend(caixa);
}

async function iniciar() {
    document.querySelectorAll(".nav a").forEach((a) => {
        if (a.dataset.nav === document.body.dataset.page) a.setAttribute("aria-current", "page");
    });

    const botaoRedefinir = $("redefinir");
    if (botaoRedefinir) {
        botaoRedefinir.addEventListener("click", async () => {
            if (!confirm("Apagar todas as reservas e hóspedes do banco de dados e restaurar o estoque do frigobar?")) return;
            const r = await aguardando(botaoRedefinir, redefinirDados);
            if (r.ok) location.reload();
            else avisar(r);
        });
    }

    const pagina = paginas[document.body.dataset.page];
    if (!pagina) return;
    try {
        await carregarEstado();
    } catch (e) {
        mostrarFalha(e.message);
        return;
    }
    const redesenhar = pagina();

    // Ao voltar para esta aba, busca de novo no banco: outra pessoa pode ter mudado algo.
    document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState !== "visible") return;
        try {
            await carregarEstado();
            redesenhar();
        } catch (e) { /* mantém a tela como está; a próxima ação mostra o erro */ }
    });
}

iniciar();
