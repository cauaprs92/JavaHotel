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
    return ok(`Reserva do quarto ${numero} encerrada.`);
}

/** Atualiza os dados do hóspede e, se pedido, troca de quarto levando o consumo junto. */
function editarReserva(numeroAtual, novoNumero, nome, email, telefone) {
    const q = buscarQuarto(numeroAtual);
    if (!q || !q.ocupado) return erro("Essa reserva não existe mais.");
    if (!nome || !email || !telefone) return erro("Preencha nome, e-mail e telefone.");

    const hospede = { nome, email, telefone };
    if (novoNumero === numeroAtual) {
        q.hospede = hospede;
        return ok(`Reserva do quarto ${numeroAtual} atualizada.`);
    }

    const destino = buscarQuarto(novoNumero);
    if (!destino) return erro("Escolha um quarto válido.");
    if (destino.ocupado) return erro(`O quarto ${novoNumero} já está ocupado.`);
    destino.ocupado = true;
    destino.hospede = hospede;
    destino.valorConsumido = q.valorConsumido;
    q.ocupado = false;
    q.hospede = null;
    q.valorConsumido = 0;
    return ok(`${nome} foi para o quarto ${novoNumero}.`);
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

// Ícone fixo (sem dados do usuário), por isso pode ir via innerHTML.
const ICONE_OLHO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONE_LIXEIRA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

const formatoBRL =new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
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
            const cancelarBtn = el("button", "Encerrar reserva", "botao perigo");
            cancelarBtn.type = "button";
            cancelarBtn.addEventListener("click", () => {
                const r = cancelar(q.numero);
                avisar(r);
                if (r.ok) salvar();
                dialogo.close();
                render();
            });
            const editarLink = el("a", "Editar reserva", "botao contorno");
            editarLink.href = `reservas.html?quarto=${q.numero}`;
            botoesDialogo.append(consumo, editarLink, cancelarBtn);
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
    const selLivre = $("sel-quarto-livre");
    const lista = $("lista-reservas");
    const dialogo = $("dialogo-reserva");
    const painelEditar = $("painel-editar");
    const painelEncerrar = $("painel-encerrar");
    const formEditar = $("form-editar");
    const selEditarQuarto = $("editar-quarto");
    let emEdicao = null; // número do quarto da reserva aberta

    const fecharDialogo = () => dialogo.close();
    $("fechar-reserva").addEventListener("click", fecharDialogo);
    dialogo.addEventListener("click", (ev) => { if (ev.target === dialogo) fecharDialogo(); });
    dialogo.addEventListener("close", () => { emEdicao = null; });

    function mostrarPainel(qual) {
        painelEditar.hidden = qual !== "editar";
        painelEncerrar.hidden = qual !== "encerrar";
    }

    function abrirEdicao(q) {
        emEdicao = q.numero;
        const n = String(q.numero).padStart(2, "0");
        $("reserva-sobretitulo").textContent = `Quarto ${n} · ${andar(q.numero)}º andar`;
        formEditar.elements.nome.value = q.hospede.nome;
        formEditar.elements.email.value = q.hospede.email;
        formEditar.elements.telefone.value = q.hospede.telefone;
        $("editar-consumo").textContent = brl(q.valorConsumido);

        // Quarto atual + quartos livres (para trocar de quarto).
        selEditarQuarto.replaceChildren(opcao(q.numero, `Quarto ${n} · atual`));
        for (const l of livres()) {
            selEditarQuarto.append(opcao(l.numero, `Quarto ${String(l.numero).padStart(2, "0")} · ${andar(l.numero)}º andar`));
        }
        selEditarQuarto.value = String(q.numero);

        mostrarPainel("editar");
        if (!dialogo.open) dialogo.showModal();
        formEditar.elements.nome.focus();
    }

    formEditar.addEventListener("submit", (ev) => {
        ev.preventDefault();
        if (emEdicao === null) return;
        const d = Object.fromEntries(new FormData(formEditar));
        const r = editarReserva(emEdicao, parseInt(d.numero, 10), d.nome.trim(), d.email.trim(), d.telefone.trim());
        avisar(r);
        if (!r.ok) return;
        salvar();
        fecharDialogo();
        render();
    });

    // Confirmação de encerramento. Pode vir da edição ou direto da lixeira do card.
    let encerrarVeioDaEdicao = false;

    function pedirEncerramento(q, veioDaEdicao) {
        emEdicao = q.numero;
        encerrarVeioDaEdicao = veioDaEdicao;
        $("encerrar-texto").replaceChildren(
            "O quarto ", el("strong", String(q.numero).padStart(2, "0")),
            " de ", el("strong", q.hospede.nome),
            ` será liberado e o consumo do frigobar (${brl(q.valorConsumido)}) será zerado. Não dá para desfazer.`,
        );
        mostrarPainel("encerrar");
        if (!dialogo.open) dialogo.showModal();
        $("encerrar-voltar").focus();
    }

    $("abrir-encerrar").addEventListener("click", () => {
        const q = buscarQuarto(emEdicao);
        if (q && q.ocupado) pedirEncerramento(q, true);
    });

    $("encerrar-voltar").addEventListener("click", () => {
        if (!encerrarVeioDaEdicao) return fecharDialogo();
        mostrarPainel("editar");
        $("abrir-encerrar").focus();
    });

    $("encerrar-confirmar").addEventListener("click", () => {
        if (emEdicao === null) return;
        const r = cancelar(emEdicao);
        avisar(r);
        if (r.ok) salvar();
        fecharDialogo();
        render();
    });

    function cartaoReserva(q) {
        // O card todo abre a edição com o mouse; pelo teclado, o botão do olho faz o mesmo.
        const cartao = el("article", undefined, "reserva");
        cartao.id = `reserva-${q.numero}`;

        const num = el("span", String(q.numero).padStart(2, "0"), "reserva-num");

        const quem = el("span", undefined, "reserva-quem");
        quem.append(
            el("span", q.hospede.nome, "reserva-nome"),
            el("span", q.hospede.email, "reserva-contato"),
            el("span", q.hospede.telefone, "reserva-contato"),
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
        acoes.append(
            botaoIcone(ICONE_OLHO, "icone-botao", `Ver e editar a reserva do quarto ${q.numero} (${q.hospede.nome})`,
                "Ver e editar", () => abrirEdicao(q)),
            botaoIcone(ICONE_LIXEIRA, "icone-botao perigo", `Encerrar a reserva do quarto ${q.numero} (${q.hospede.nome})`,
                "Encerrar reserva", () => pedirEncerramento(q, false)),
        );

        const rodape = el("span", undefined, "reserva-rodape");
        const frigobar = el("span", "Frigobar ");
        frigobar.append(el("strong", brl(q.valorConsumido)));
        rodape.append(el("span", `${andar(q.numero)}º andar`), frigobar);

        cartao.append(num, quem, acoes, rodape);
        cartao.addEventListener("click", () => abrirEdicao(q));
        return cartao;
    }

    function render() {
        preencherSelect(selLivre,
            livres().map((q) => [q.numero, `Quarto ${String(q.numero).padStart(2, "0")} · ${andar(q.numero)}º andar`]),
            "Nenhum quarto livre");
        formReservar.querySelector("button").disabled = selLivre.disabled;

        renderLista();
    }

    /* ----- Busca e filtros das reservas ativas ----- */

    const busca = $("busca-reservas");
    const filtroAndar = $("filtro-andar");
    const filtroFrigobar = $("filtro-frigobar");
    const filtroOrdem = $("filtro-ordem");
    const barraFiltros = document.querySelector(".filtros-reservas");

    const totalAndares = Math.ceil(estado.quartos.length / QUARTOS_POR_ANDAR);
    for (let a = 1; a <= totalAndares; a++) filtroAndar.append(opcao(a, `${a}º andar`));

    // Minúsculas e sem acento, para "joao" achar "João".
    const normalizar = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const soDigitos = (t) => String(t).replace(/\D/g, "");

    function combinaBusca(q, termo) {
        if (!termo) return true;
        const texto = normalizar([q.hospede.nome, q.hospede.email, q.hospede.telefone].join(" "));
        if (texto.includes(normalizar(termo))) return true;
        const digitos = soDigitos(termo);
        if (!digitos) return false;
        // Número do quarto ("7" ou "07") ou trecho do telefone só com números.
        return parseInt(digitos, 10) === q.numero || soDigitos(q.hospede.telefone).includes(digitos);
    }

    function renderLista() {
        const ativos = ocupados();
        barraFiltros.hidden = ativos.length === 0;
        const plural = (n) => (n === 1 ? "1 reserva" : `${n} reservas`);

        if (!ativos.length) {
            $("total-reservas").textContent = plural(0);
            const vazio = el("div", undefined, "vazio");
            vazio.append(el("p", "Nenhuma reserva ativa. As novas reservas aparecem aqui."));
            vazio.firstChild.style.margin = "0";
            lista.replaceChildren(vazio);
            return;
        }

        const termo = busca.value.trim();
        const andarEscolhido = parseInt(filtroAndar.value, 10);
        const frigobar = filtroFrigobar.value;

        const visiveis = ativos.filter((q) =>
            combinaBusca(q, termo)
            && (!andarEscolhido || andar(q.numero) === andarEscolhido)
            && (frigobar !== "com" || q.valorConsumido > 0)
            && (frigobar !== "sem" || q.valorConsumido === 0));

        if (filtroOrdem.value === "nome") {
            visiveis.sort((a, b) => a.hospede.nome.localeCompare(b.hospede.nome, "pt-BR"));
        } else if (filtroOrdem.value === "consumo") {
            visiveis.sort((a, b) => b.valorConsumido - a.valorConsumido || a.numero - b.numero);
        }

        $("total-reservas").textContent = visiveis.length === ativos.length
            ? plural(ativos.length)
            : `${visiveis.length} de ${plural(ativos.length)}`;

        if (!visiveis.length) {
            const vazio = el("div", undefined, "vazio");
            const limpar = el("button", "Limpar filtros", "botao contorno");
            limpar.type = "button";
            limpar.addEventListener("click", limparFiltros);
            vazio.append(el("p", "Nenhuma reserva encontrada com esses filtros."), limpar);
            lista.replaceChildren(vazio);
            return;
        }
        lista.replaceChildren(...visiveis.map(cartaoReserva));
    }

    function limparFiltros() {
        busca.value = "";
        filtroAndar.value = "";
        filtroFrigobar.value = "";
        filtroOrdem.value = "quarto";
        renderLista();
        busca.focus();
    }

    busca.addEventListener("input", renderLista);
    busca.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && busca.value) { busca.value = ""; renderLista(); } });
    [filtroAndar, filtroFrigobar, filtroOrdem].forEach((s) => s.addEventListener("change", renderLista));

    ligar(formReservar, (d) => reservar(parseInt(d.numero, 10), d.nome.trim(), d.email.trim(), d.telefone.trim()), render);

    render();

    // Vindo do mapa de quartos: escolhe o quarto livre ou já abre a reserva para editar.
    const pedido = parametro("quarto");
    if (pedido) {
        if ([...selLivre.options].some((o) => o.value === pedido)) {
            selLivre.value = pedido;
            formReservar.querySelector("[name=nome]").focus();
        } else {
            const q = buscarQuarto(parseInt(pedido, 10));
            if (q && q.ocupado) abrirEdicao(q);
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

        preencherSelect(selQuarto,
            ocupados().map((q) => [q.numero, `Quarto ${String(q.numero).padStart(2, "0")} · ${q.hospede.nome}`]),
            "Nenhum quarto ocupado");
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
