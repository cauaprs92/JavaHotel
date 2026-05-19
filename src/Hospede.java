public class Hospede {
    
    private int id;
    private String nome;
    private String email;
    private double telefone;

    public Hospede(int id, String nome, String email, double telefone){
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.telefone = telefone;
    }   

    public int getId(){
        return id;
    }
    public void setId(int id){
        this.id = id;
    }
    public String getNome(){
        return nome;
    } 
    public void setNome(String nome){
        this.nome = nome;
    } 
    public String getEmail(){
        return email;
    } 
    public void setEmail(String email){
        this.email = email;
    }
    public double getTelefone(){
        return telefone;
    } 
    public void setTelefone(double telefone){
        this.telefone = telefone;
    }
    
    //--------------------------------------------------------------------------//

    public void exibirDados(){
        System.out.println("nome: "+ nome);
        System.out.println("email: "+ email);
        System.out.println("telefone: "+ telefone);
    }
}


