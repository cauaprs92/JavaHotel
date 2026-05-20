public class ConsumoFrigobar {

    // REUTILIZAR CLASSE PRODUTOFRIGOBAR!!!!
    
    private double quarto;
    private String produto;
    private double quantidadeConsumida;

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
        // Delega o calculo ao ProdutoFrigobar (reutilizacao de codigo)
        return produto.calcularTotal(quantidadeConsumida);
    }


    public void exibirConsumo() {
        System.out.println("  Quarto  : " + quarto.getNumero());
        System.out.println("  Produto : " + produto.getNomeProduto());
        System.out.println("  Qtd     : " + quantidadeConsumida);
        System.out.printf ("  Valor   : R$ %.2f%n", calcularValorConsumo());
    }
}