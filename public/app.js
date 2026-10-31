/* ==========================================================
   JavaHotel — regras de reservas e frigobar
   Os dados ficam no localStorage do navegador.
   Cada página chama sua função pelo atributo data-page do <body>.
   ========================================================== */

const TOTAL_QUARTOS = 20;
const QUARTOS_POR_ANDAR = 5;
const ESTOQUE_REFERENCIA = 20;
const ESTOQUE_BAIXO = 5;
const STORAGE_KEY = "javahotel-estado";

/* ---------- Estado ---------- */

function estadoInicial() {
    const quartos = [];
    for (let i = 1; i <= TOTAL_QUARTOS; i++) {
        quartos.push({ numero: i, ocupado: false, hospede: null, valorConsumido: 0 });
    }
    const produtos = [
        { nomeProduto: "Água Mineral 500ml", preco: 3.5, quantidade: 20 },
        { nomeProduto: "Refrigerante Lata", preco: 6.0, quantidade: 15 },
        { nomeProduto: "Suco de Laranja", preco: 7.0, quantidade: 10 },
        { nomeProduto: "Cerveja Long Neck", preco: 9.0, quantidade: 12 },
        { nomeProduto: "Chocolate ao Leite", preco: 5.5, quantidade: 18 },
    ];
    return { quartos, produtos };
}

function carregar() {
    try {
        const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (salvo && Array.isArray(salvo.quartos) && Array.isArray(salvo.produtos)) return salvo;
    } catch (e) { /* storage indisponível ou corrompido */ }
    return estadoInicial();
}

function salvar() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(estado)); } catch (e) { /* ignora */ }
}

let estado = carregar();

/* ---------- Regras ---------- */

const ok = (msg) => ({ ok: true, msg });
const erro = (msg) => ({ ok: false, msg });

function buscarQuarto(numero) {
    return estado.quartos.find((q) => q.numero === numero) || null;
}

function reservar(numero, nome, email, telefone) {
    const q = buscarQuarto(numero);
    if (!q) return erro("Escolha um quarto válido.");
    if (q.ocupado) return erro(`O quarto ${numero} já está ocupado.`);
    q.ocupado = true;
    q.hospede = { nome, email, telefone };
    q.valorConsumido = 0;
    return ok(`Quarto ${numero} reservado para ${nome}.`);
}

function cancelar(numero) {
    const q = buscarQuarto(numero);
    if (!q) return erro("Escolha um quarto válido.");
    if (!q.ocupado) return erro(`O quarto ${numero} já está livre.`);
    q.ocupado = false;
    q.hospede = null;
    q.valorConsumido = 0;
    return ok(`Reserva do quarto ${numero} cancelada.`);
}

/**
 * Lança vários produtos de uma vez em um quarto.
 * itens: [{ indice, quantidade }]. Valida tudo antes; se algo falhar, nada é lançado.
 */
function registrarConsumo(numero, itens) {
    const q = buscarQuarto(numero);
    if (!q || !q.ocupado) return erro("Escolha um quarto com hóspede.");
    const validos = itens.filter((i) => i.quantidade > 0);
    if (!validos.length) return erro("Adicione pelo menos um produto.");

    for (const { indice, quantidade } of validos) {
        const produto = estado.produtos[indice];
        if (!produto) return erro("Produto inválido.");
        if (!Number.isInteger(quantidade) || quantidade > produto.quantidade) {
            return erro(`${produto.nomeProduto}: só há ${produto.quantidade} em estoque.`);
        }
    }

    let valor = 0;
    let unidades = 0;
    for (const { indice, quantidade } of validos) {
        const produto = estado.produtos[indice];
        produto.quantidade -= quantidade;
        valor += produto.preco * quantidade;
        unidades += quantidade;
    }
    q.valorConsumido += valor;
    const rotulo = unidades === 1 ? "1 item" : `${unidades} itens`;
    return ok(`${rotulo} lançados no quarto ${numero} · ${brl(valor)}.`);
}

/* ---------- Utilidades ---------- */

const formatoBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brl = (v) => formatoBRL.format(v);
const $ = (id) => document.getElementById(id);
const ocupados = () => estado.quartos.filter((q) => q.ocupado);
const livres = () => estado.quartos.filter((q) => !q.ocupado);
const andar = (numero) => Math.ceil(numero / QUARTOS_POR_ANDAR);
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

/** Liga um formulário a uma ação; salva e re-renderiza quando dá certo. */
function ligar(form, acao, aoTerminar) {
    form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const resultado = acao(Object.fromEntries(new FormData(form)));
        avisar(resultado);
        if (resultado.ok) {
            salvar();
            form.reset();
        }
        aoTerminar(resultado);
    });
}

/* ---------- Página: Início ---------- */

function paginaInicio() {
    const total = estado.quartos.length;
    const ocup = ocupados();
    const pct = Math.round((ocup.length / total) * 100);

    $("data-hoje").textContent = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long", day: "numeric", month: "long",
    }).format(new Date());

    $("anel").style.setProperty("--p", pct);
    $("anel-pct").textContent = pct + "%";
    $("anel").setAttribute("aria-label", `Taxa de ocupação: ${pct}%`);
    $("ocupados-texto").textContent = `${ocup.length} de ${total}`;

    $("ind-livres").textContent = total - ocup.length;
    $("ind-hospedes").textContent = ocup.length;
    $("ind-consumo").textContent = brl(ocup.reduce((s, q) => s + q.valorConsumido, 0));
    $("ind-estoque").textContent = estado.produtos.reduce((s, p) => s + p.quantidade, 0);

    const lista = $("lista-hospedes");
    lista.replaceChildren();
    if (!ocup.length) {
        const vazio = el("div", undefined, "vazio");
        const link = el("a", "Fazer a primeira reserva", "botao");
        link.href = "reservas.html";
        vazio.append(el("p", "Nenhum hóspede no momento."), link);
        lista.append(vazio);
        return;
    }
    const ul = el("ul", undefined, "lista");
    for (const q of ocup.slice(0, 6)) {
        const li = el("li");
        const quem = el("div");
        quem.append(el("span", q.hospede.nome, "nome"), el("span", q.hospede.email, "sub"));
        li.append(el("span", String(q.numero).padStart(2, "0"), "num"), quem, el("span", brl(q.valorConsumido), "valor"));
        ul.append(li);
    }
    lista.append(ul);
}

/* ---------- Página: Quartos ---------- */

function paginaQuartos() {
    let filtro = "todos";
    const mapa = $("mapa-quartos");
    const dialogo = $("dialogo-quarto");
    const botoes = document.querySelectorAll("[data-filtro]");

    botoes.forEach((b) => b.addEventListener("click", () => {
        filtro = b.dataset.filtro;
        render();
    }));

    $("fechar-dialogo").addEventListener("click", () => dialogo.close());
    dialogo.addEventListener("click", (ev) => { if (ev.target === dialogo) dialogo.close(); });

    function abrir(q) {
        $("dialogo-titulo").textContent = `Quarto ${String(q.numero).padStart(2, "0")}`;
        $("dialogo-andar").textContent = `${andar(q.numero)}º andar`;
        const dl = $("dialogo-detalhes");
        const botoesDialogo = $("dialogo-botoes");
        dl.replaceChildren();
        botoesDialogo.replaceChildren();

        const linha = (rotulo, valor) => {
            const d = el("div");
            d.append(el("dt", rotulo), el("dd", valor));
            dl.append(d);
        };

        if (q.ocupado) {
            linha("Hóspede", q.hospede.nome);
            linha("E-mail", q.hospede.email);
            linha("Telefone", q.hospede.telefone);
            linha("Consumo do frigobar", brl(q.valorConsumido));
            const consumo = el("a", "Lançar consumo no frigobar", "botao");
            consumo.href = `frigobar.html?quarto=${q.numero}`;
            const cancelarBtn = el("button", "Cancelar reserva", "botao perigo");
            cancelarBtn.type = "button";
            cancelarBtn.addEventListener("click", () => {
                const r = cancelar(q.numero);
                avisar(r);
                if (r.ok) salvar();
                dialogo.close();
                render();
            });
            botoesDialogo.append(consumo, cancelarBtn);
        } else {
            linha("Situação", "Disponível");
            linha("Andar", `${andar(q.numero)}º`);
            const reservarLink = el("a", "Reservar este quarto", "botao");
            reservarLink.href = `reservas.html?quarto=${q.numero}`;
            botoesDialogo.append(reservarLink);
        }
        dialogo.showModal();
    }

    function render() {
        const n = { todos: estado.quartos.length, livres: livres().length, ocupados: ocupados().length };
        botoes.forEach((b) => {
            b.setAttribute("aria-pressed", String(b.dataset.filtro === filtro));
            b.querySelector(".contagem").textContent = n[b.dataset.filtro];
        });

        const visiveis = estado.quartos.filter((q) =>
            filtro === "todos" || (filtro === "ocupados" ? q.ocupado : !q.ocupado));

        mapa.replaceChildren();
        if (!visiveis.length) {
            mapa.append(el("p", "Nenhum quarto neste filtro.", "aviso"));
            return;
        }

        const totalAndares = Math.ceil(estado.quartos.length / QUARTOS_POR_ANDAR);
        for (let a = totalAndares; a >= 1; a--) {
            const doAndar = visiveis.filter((q) => andar(q.numero) === a);
            if (!doAndar.length) continue;

            const livresNoAndar = estado.quartos.filter((q) => andar(q.numero) === a && !q.ocupado).length;
            const bloco = el("section", undefined, "andar");
            const rotulo = el("div", undefined, "andar-rotulo");
            rotulo.append(el("h2", `${a}º andar`), el("span", `${livresNoAndar} de ${QUARTOS_POR_ANDAR} livres`));
            const grade = el("div", undefined, "grade-quartos");

            for (const q of doAndar) grade.append(cartaoQuarto(q));
            bloco.append(rotulo, grade);
            mapa.append(bloco);
        }
    }

    function cartaoQuarto(q) {
        const card = el("button", undefined, "quarto" + (q.ocupado ? " ocupado" : ""));
        card.type = "button";
        card.setAttribute("aria-label", `Quarto ${q.numero}, ${q.ocupado ? "ocupado por " + q.hospede.nome : "livre"}`);

        const topo = el("div", undefined, "quarto-topo");
        topo.append(el("span", String(q.numero).padStart(2, "0"), "quarto-num"), el("i", undefined, "ponto" + (q.ocupado ? " ocupado" : "")));

        const info = el("div", undefined, "quarto-info");
        if (q.ocupado) {
            info.append(el("span", q.hospede.nome, "nome"), el("span", "Frigobar " + brl(q.valorConsumido), "sub"));
        } else {
            info.append(el("span", "Disponível", "nome"), el("span", "Pronto para check-in", "sub"));
        }

        card.append(topo, info);
        card.addEventListener("click", () => abrir(q));
        return card;
    }

    render();
}

/* ---------- Página: Reservas ---------- */

function paginaReservas() {
    const formReservar = $("form-reservar");
    const formCancelar = $("form-cancelar");
    const selLivre = $("sel-quarto-livre");
    const selOcupado = $("sel-quarto-ocupado");

    function render() {
        preencherSelect(selLivre,
            livres().map((q) => [q.numero, `Quarto ${String(q.numero).padStart(2, "0")} · ${andar(q.numero)}º andar`]),
            "Nenhum quarto livre");
        preencherSelect(selOcupado,
            ocupados().map((q) => [q.numero, `Quarto ${String(q.numero).padStart(2, "0")} · ${q.hospede.nome}`]),
            "Nenhuma reserva ativa");
        formReservar.querySelector("button").disabled = selLivre.disabled;
        formCancelar.querySelector("button").disabled = selOcupado.disabled;

        const tbody = $("tabela-reservas");
        tbody.replaceChildren();
        const ativos = ocupados();
        $("total-reservas").textContent = ativos.length === 1 ? "1 reserva" : `${ativos.length} reservas`;
        if (!ativos.length) {
            const tr = el("tr");
            const td = el("td", "Nenhuma reserva ativa ainda.");
            td.colSpan = 4;
            td.style.color = "var(--muted)";
            tr.append(td);
            tbody.append(tr);
            return;
        }
        for (const q of ativos) {
            const tr = el("tr");
            const tdNum = el("td");
            tdNum.append(el("span", String(q.numero).padStart(2, "0"), "quarto-mini"));
            const tdContato = el("td");
            tdContato.append(el("div", q.hospede.email), el("div", q.hospede.telefone, "quarto-andar"));
            tr.append(tdNum, el("td", q.hospede.nome), tdContato, el("td", brl(q.valorConsumido), "num"));
            tbody.append(tr);
        }
    }

    ligar(formReservar, (d) => reservar(parseInt(d.numero, 10), d.nome.trim(), d.email.trim(), d.telefone.trim()), render);
    ligar(formCancelar, (d) => cancelar(parseInt(d.numero, 10)), render);

    render();

    // Vindo do mapa de quartos: já deixa o quarto escolhido.
    const pedido = parametro("quarto");
    if (pedido) {
        if ([...selLivre.options].some((o) => o.value === pedido)) {
            selLivre.value = pedido;
            formReservar.querySelector("[name=nome]").focus();
        } else if ([...selOcupado.options].some((o) => o.value === pedido)) {
            selOcupado.value = pedido;
        }
    }
}

/* ---------- Página: Frigobar ---------- */

function paginaFrigobar() {
    const form = $("form-consumo");
    const selQuarto = $("sel-quarto-consumo");
    const listaProdutos = $("lista-produtos-consumo");
    const botaoLancar = form.querySelector("button[type=submit]");
    const aviso = $("aviso-sem-hospede");

    // Quantidade escolhida de cada produto (mesma ordem de estado.produtos).
    let qtds = estado.produtos.map(() => 0);
    let semHospede = false;

    function atualizarResumo() {
        let total = 0;
        let unidades = 0;
        estado.produtos.forEach((p, i) => {
            total += p.preco * qtds[i];
            unidades += qtds[i];
        });
        $("resumo-total").textContent = brl(total);
        $("resumo-itens").textContent = unidades === 0
            ? "Nenhum item selecionado"
            : `${unidades} ${unidades === 1 ? "item" : "itens"} a lançar`;
        botaoLancar.disabled = semHospede || unidades === 0;
    }

    function linhaProduto(p, i) {
        const linha = el("div", undefined, "produto-linha");
        const esgotado = p.quantidade === 0;
        if (esgotado) linha.classList.add("esgotado");

        const info = el("div", undefined, "produto-info");
        info.append(
            el("span", p.nomeProduto, "nome"),
            el("span", esgotado ? `${brl(p.preco)} · esgotado` : `${brl(p.preco)} · ${p.quantidade} em estoque`, "sub"),
        );

        const contador = el("div", undefined, "contador");
        const menos = el("button", "−");
        const mais = el("button", "+");
        const campo = el("input");
        menos.type = mais.type = "button";
        menos.setAttribute("aria-label", `Tirar um ${p.nomeProduto}`);
        mais.setAttribute("aria-label", `Adicionar um ${p.nomeProduto}`);
        campo.type = "number";
        campo.min = "0";
        campo.max = String(p.quantidade);
        campo.inputMode = "numeric";
        campo.setAttribute("aria-label", `Quantidade de ${p.nomeProduto}`);

        function definir(n) {
            qtds[i] = Math.max(0, Math.min(p.quantidade, Number.isFinite(n) ? Math.floor(n) : 0));
            campo.value = String(qtds[i]);
            menos.disabled = semHospede || qtds[i] === 0;
            mais.disabled = semHospede || qtds[i] >= p.quantidade;
            campo.disabled = semHospede || esgotado;
            linha.classList.toggle("ativo", qtds[i] > 0);
            atualizarResumo();
        }

        menos.addEventListener("click", () => definir(qtds[i] - 1));
        mais.addEventListener("click", () => definir(qtds[i] + 1));
        campo.addEventListener("input", () => {
            if (campo.value !== "") definir(parseInt(campo.value, 10));
        });
        campo.addEventListener("blur", () => definir(parseInt(campo.value, 10)));

        contador.append(menos, campo, mais);
        linha.append(info, contador);
        definir(qtds[i]);
        return linha;
    }

    function render(resultado) {
        if (resultado && resultado.ok) qtds = estado.produtos.map(() => 0);

        preencherSelect(selQuarto,
            ocupados().map((q) => [q.numero, `Quarto ${String(q.numero).padStart(2, "0")} · ${q.hospede.nome}`]),
            "Nenhum quarto ocupado");
        semHospede = selQuarto.disabled;
        aviso.hidden = !semHospede;

        listaProdutos.replaceChildren(...estado.produtos.map(linhaProduto));
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
    ligar(form, (d) => registrarConsumo(
        parseInt(d.numero, 10),
        qtds.map((quantidade, indice) => ({ indice, quantidade })),
    ), (resultado) => {
        render(resultado);
        if ([...selQuarto.options].some((o) => o.value === ultimoQuarto)) selQuarto.value = ultimoQuarto;
    });

    render();

    const pedido = parametro("quarto");
    if (pedido && [...selQuarto.options].some((o) => o.value === pedido)) selQuarto.value = pedido;
}

/* ---------- Inicialização ---------- */

const paginas = {
    inicio: paginaInicio,
    quartos: paginaQuartos,
    reservas: paginaReservas,
    frigobar: paginaFrigobar,
};

document.querySelectorAll(".nav a").forEach((a) => {
    if (a.dataset.nav === document.body.dataset.page) a.setAttribute("aria-current", "page");
});

const botaoRedefinir = $("redefinir");
if (botaoRedefinir) {
    botaoRedefinir.addEventListener("click", () => {
        if (!confirm("Apagar todas as reservas e restaurar o estoque do frigobar?")) return;
        estado = estadoInicial();
        salvar();
        location.reload();
    });
}

(paginas[document.body.dataset.page] || (() => {}))();
