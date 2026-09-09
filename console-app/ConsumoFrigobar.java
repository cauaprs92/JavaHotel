public class ConsumoFrigobar {

    private Quarto quarto;
    private ProdutoFrigobar produto;
    private int quantidadeConsumida;

    public ConsumoFrigobar(){
    }

    public ConsumoFrigobar(Quarto quarto, ProdutoFrigobar produto) {
        this.quarto = quarto;
        this.produto = produto;
        this.quantidadeConsumida = 0;
    }
    
    public ConsumoFrigobar(Quarto quarto, ProdutoFrigobar produto, int quantidadeConsumida) {
        this.quarto = quarto;
        this.produto = produto;
        this.quantidadeConsumida = quantidadeConsumida;
    }

    public void registrarConsumo() {
        int estoqueAtual = produto.getQuantidade();
        if (quantidadeConsumida > estoqueAtual) {
            System.out.println("  Estoque insuficiente! Disponivel: " + estoqueAtual);
            return;
        }
        produto.setQuantidade(estoqueAtual - quantidadeConsumida);
        double valor = calcularValorConsumo();
        quarto.adicionarConsumo(valor);
        System.out.println("  Consumo registrado com sucesso! Valor: R$ " + String.format("%.2f", valor));
    }

    public double calcularValorConsumo() {
        return produto.calcularTotal(quantidadeConsumida);
    }

    public void exibirConsumo() {
        System.out.println("  Quarto  : " + quarto.getNumero());
        System.out.println("  Produto : " + produto.getNomeProduto());
        System.out.println("  Qtd     : " + quantidadeConsumida);
        System.out.printf("  Valor   : R$ %.2f%n", calcularValorConsumo());
    }
}