public class ProdutoFrigobar {

    private String nomeProduto;
    private double preco;
    private double quantidade;
    
    public ProdutoFrigobar(){

    }
    public ProdutoFrigobar(String nomeProduto, double preco, double quantidade){
        this.nomeProduto = nomeProduto;
        this.preco = preco;
        this.quantidade = quantidade;
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
    public double getQuantidade(){
        return quantidade;
    } 
    public void setQuantidade(double quantidade){
        this.quantidade = quantidade;
    }

    public double calcularTotal(){
        return 0.0;
    }
    public String exibirProduto(){
        return "";
    }
}