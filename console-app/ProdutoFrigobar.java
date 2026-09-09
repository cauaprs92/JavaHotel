public class ProdutoFrigobar {

    private String nomeProduto;
    private double preco;
    private int quantidade;
    
    public ProdutoFrigobar(){

    }
    public ProdutoFrigobar(String nomeProduto, double preco, int quantidade){
        this.nomeProduto = nomeProduto;
        this.preco = preco;
        this.quantidade = quantidade;
    }
    public ProdutoFrigobar(String nomeProduto, double preco) {
        this.nomeProduto = nomeProduto;
        this.preco = preco;
        this.quantidade = 0;
    }

    public String getNomeProduto(){
        return nomeProduto;
    }
    public void setNomeProduto(String nomeProduto){
        this.nomeProduto = nomeProduto;
    }
    public double getPreco(){
        return preco;
    } 
    public void setPreco(double preco){
        this.preco = preco;
    } 
    public int getQuantidade(){
        return quantidade;
    } 
    public void setQuantidade(int quantidade){
        this.quantidade = quantidade;
    }

    public double calcularTotal(int qtdConsumida) {
        return preco * qtdConsumida;
    }
    public double calcularTotal() {
        return preco * quantidade;
    }
    public String exibirProduto() {
        return String.format("  %-20s | Preco: R$ %6.2f | Estoque: %d",
                nomeProduto, preco, quantidade);
    }
}