import java.util.Scanner;
 
public class Hotel {
 
    private Quarto[] quartos;
    private ProdutoFrigobar[] produtos;
    private int totalProdutos;
 
    public Hotel() {
        quartos = new Quarto[100];
        produtos = new ProdutoFrigobar[20];
        totalProdutos = 0;
 
        // Inicializa os 100 quartos (numerados de 1 a 100)
        for (int i = 0; i < 100; i++) {
            quartos[i] = new Quarto(i + 1);
        }
 
        // Cadastra produtos iniciais do frigobar
        produtos[totalProdutos++] = new ProdutoFrigobar("Agua Mineral 500ml",  3.50,  20);
        produtos[totalProdutos++] = new ProdutoFrigobar("Refrigerante Lata",   6.00,  15);
        produtos[totalProdutos++] = new ProdutoFrigobar("Suco de Laranja",     7.00,  10);
        produtos[totalProdutos++] = new ProdutoFrigobar("Cerveja Long Neck",   9.00,  12);
        produtos[totalProdutos++] = new ProdutoFrigobar("Chocolate ao Leite",  5.50,  18);
        produtos[totalProdutos++] = new ProdutoFrigobar("Amendoim Salgado",    4.00,  20);
        produtos[totalProdutos++] = new ProdutoFrigobar("Batata Chips",        5.00,  16);
        produtos[totalProdutos++] = new ProdutoFrigobar("Vinho Tinto 187ml",  18.00,   8);
    }
 
    // -----------------------------------------------------------------------
    // 1. Reservar Quarto
    // -----------------------------------------------------------------------
    public void reservarQuarto(Scanner sc) {
        System.out.print("  Numero do quarto (1-100): ");
        int num = lerInteiro(sc);
        if (num < 1 || num > 100) { System.out.println("  Numero invalido."); return; }
 
        Quarto q = quartos[num - 1];
        if (q.isOcupado()) { System.out.println("  Quarto ja ocupado."); return; }
 
        System.out.print("  Nome do hospede: ");
        String nome = sc.nextLine().trim();
        System.out.print("  E-mail: ");
        String email = sc.nextLine().trim();
        System.out.print("  Telefone: ");
        String tel = sc.nextLine().trim();
 
        Hospede h = new Hospede(nome, email, tel);
        q.reservarQuarto(h);
    }
 
    // -----------------------------------------------------------------------
    // 2. Cancelar Reserva
    // -----------------------------------------------------------------------
    public void cancelarReserva(Scanner sc) {
        System.out.print("  Numero do quarto (1-100): ");
        int num = lerInteiro(sc);
        if (num < 1 || num > 100) { System.out.println("  Numero invalido."); return; }
        quartos[num - 1].cancelarReserva();
    }
 
    // -----------------------------------------------------------------------
    // 3. Listar Reservas
    // -----------------------------------------------------------------------
    public void listarReservas() {
        System.out.println("\n  ====== QUARTOS OCUPADOS ======");
        boolean algum = false;
        for (int i = 0; i < 100; i++) {
            if (quartos[i].isOcupado()) {
                quartos[i].exibirResumo();
                System.out.println("  ------------------------------");
                algum = true;
            }
        }
        if (!algum) System.out.println("  Nenhum quarto ocupado no momento.");
    }
 
    // -----------------------------------------------------------------------
    // 4. Consultar Hospede
    // -----------------------------------------------------------------------
    public void consultarHospede(Scanner sc) {
        System.out.print("  Numero do quarto (1-100): ");
        int num = lerInteiro(sc);
        if (num < 1 || num > 100) { System.out.println("  Numero invalido."); return; }
 
        Quarto q = quartos[num - 1];
        if (!q.isOcupado()) { System.out.println("  Quarto livre, sem hospede."); return; }
 
        System.out.println("\n  === DADOS DO HOSPEDE - Quarto " + num + " ===");
        q.consultarHospede();
        System.out.printf("  Consumo frigobar: R$ %.2f%n", q.getValorConsumido());
    }
 
    // -----------------------------------------------------------------------
    // 5. Editar Hospede
    // -----------------------------------------------------------------------
    public void editarHospede(Scanner sc) {
        System.out.print("  Numero do quarto (1-100): ");
        int num = lerInteiro(sc);
        if (num < 1 || num > 100) { System.out.println("  Numero invalido."); return; }
 
        Quarto q = quartos[num - 1];
        if (!q.isOcupado()) { System.out.println("  Quarto livre, sem hospede."); return; }
 
        Hospede h = q.getHospede();
        System.out.println("  Deixe em branco para manter o valor atual.");
 
        System.out.print("  Novo nome [" + h.getNome() + "]: ");
        String nome = sc.nextLine().trim();
        if (!nome.isEmpty()) h.setNome(nome);
 
        System.out.print("  Novo e-mail [" + h.getEmail() + "]: ");
        String email = sc.nextLine().trim();
        if (!email.isEmpty()) h.setEmail(email);
 
        System.out.print("  Novo telefone [" + h.getTelefone() + "]: ");
        String tel = sc.nextLine().trim();
        if (!tel.isEmpty()) h.setTelefone(tel);
 
        System.out.println("  Dados atualizados com sucesso!");
    }
 
    // -----------------------------------------------------------------------
    // 6. Listar Produtos do Frigobar
    // -----------------------------------------------------------------------
    public void listarProdutosFrigobar() {
        System.out.println("\n  ====== PRODUTOS DO FRIGOBAR ======");
        for (int i = 0; i < totalProdutos; i++) {
            System.out.println("  [" + (i + 1) + "] " + produtos[i].exibirProduto());
        }
    }
 
    // -----------------------------------------------------------------------
    // 7. Registrar Consumo do Frigobar
    // -----------------------------------------------------------------------
    public void registrarConsumoFrigobar(Scanner sc) {
        System.out.print("  Numero do quarto (1-100): ");
        int num = lerInteiro(sc);
        if (num < 1 || num > 100) { System.out.println("  Numero invalido."); return; }
 
        Quarto q = quartos[num - 1];
        if (!q.isOcupado()) { System.out.println("  Quarto livre, sem hospede."); return; }
 
        listarProdutosFrigobar();
        System.out.print("  Escolha o produto (1-" + totalProdutos + "): ");
        int op = lerInteiro(sc);
        if (op < 1 || op > totalProdutos) { System.out.println("  Produto invalido."); return; }
 
        ProdutoFrigobar prod = produtos[op - 1];
        System.out.print("  Quantidade a consumir: ");
        int qtd = lerInteiro(sc);
        if (qtd <= 0) { System.out.println("  Quantidade invalida."); return; }
 
        // Delega o controle ao ConsumoFrigobar (delegacao de responsabilidade)
        ConsumoFrigobar consumo = new ConsumoFrigobar(q, prod, qtd);
        consumo.registrarConsumo();
    }
 
    // -----------------------------------------------------------------------
    // 8. Calcular Valor Total do Quarto
    // -----------------------------------------------------------------------
    public void calcularTotalQuarto(Scanner sc) {
        System.out.print("  Numero do quarto (1-100): ");
        int num = lerInteiro(sc);
        if (num < 1 || num > 100) { System.out.println("  Numero invalido."); return; }
 
        Quarto q = quartos[num - 1];
        if (!q.isOcupado()) { System.out.println("  Quarto livre, sem consumo."); return; }
 
        System.out.println("\n  === TOTAL - Quarto " + num + " ===");
        System.out.println("  Hospede : " + q.getHospede().getNome());
        System.out.printf ("  Total consumido no frigobar: R$ %.2f%n", q.getValorConsumido());
    }
 
    // -----------------------------------------------------------------------
    // Utilitario: le inteiro e descarta o resto da linha
    // -----------------------------------------------------------------------
    private int lerInteiro(Scanner sc) {
        int valor = -1;
        try {
            valor = Integer.parseInt(sc.nextLine().trim());
        } catch (NumberFormatException e) {
            // retorna -1 em caso de entrada invalida
        }
        return valor;
    }
}