# JavaHotel

Projeto de estudos de Java: um sistema de reservas de hotel com frigobar, feito em duas versões:

1. **`console-app/`** — a versão original, em Java puro, rodando no terminal.
2. **`src/main/`** — a mesma ideia reescrita como aplicação web com **Spring Boot** + **Thymeleaf**, para estudar o framework.

Nenhuma versão depende da outra. São dois exercícios lado a lado no mesmo repositório.

---

## Estrutura do projeto

```
JavaHotel/
├── console-app/              # Versão console (Java puro, sem Maven)
│   ├── Main.java             # Menu principal (loop + switch)
│   ├── Hotel.java            # Regras de negócio e leitura do teclado
│   ├── Quarto.java           # Modelo: quarto, ocupação, consumo
│   ├── Hospede.java          # Modelo: dados do hóspede
│   ├── ProdutoFrigobar.java  # Modelo: produto do frigobar
│   └── ConsumoFrigobar.java  # Registra o consumo de um produto num quarto
│
├── src/main/                 # Versão web (Spring Boot)
│   ├── java/com/hotel/
│   │   ├── HotelApplication.java      # Ponto de entrada (main)
│   │   ├── controller/
│   │   │   └── HotelController.java   # Recebe requisições HTTP (rotas)
│   │   ├── service/
│   │   │   └── HotelService.java      # Regras de negócio (em memória)
│   │   └── model/
│   │       ├── Quarto.java
│   │       ├── Hospede.java
│   │       └── ProdutoFrigobar.java
│   └── resources/
│       ├── application.properties     # Configurações (porta, etc.)
│       ├── templates/index.html       # Página HTML (Thymeleaf)
│       └── static/css/style.css       # Estilo da página
│
├── pom.xml                   # Configuração do Maven (dependências do Spring)
├── mvnw / mvnw.cmd           # Maven Wrapper — não precisa instalar o Maven
└── .vscode/settings.json     # Configuração do VS Code para o console-app
```

---

## Versão 1: Console (`console-app/`)

Aplicação de terminal simples, sem frameworks — só Java e orientação a objetos.

**Como rodar (dentro da pasta `console-app/`):**
```bash
javac *.java -d bin
java -cp bin Main
```

Ou use o botão "Run" do VS Code diretamente no `Main.java`.

Fluxo: um menu numerado (`1` a `8`) permite reservar quarto, cancelar reserva, listar hóspedes, registrar consumo de frigobar, etc. Tudo fica guardado apenas na memória enquanto o programa roda.

---

## Versão 2: Web com Spring Boot (`src/main/`)

A mesma lógica (quartos, hóspedes, frigobar), só que exposta como página web.

### Como rodar

Na raiz do projeto:
```bash
./mvnw spring-boot:run
```

Depois abra no navegador:
```
http://localhost:8081
```

> A porta é `8081` (não `8080`) porque, no ambiente de estudo original, a `8080` já estava sendo usada por outro programa. Se quiser mudar, edite `server.port` em `src/main/resources/application.properties`.

Para parar o servidor, use `Ctrl+C` no terminal onde ele está rodando.

### Como a aplicação está organizada (padrão MVC do Spring)

```
Navegador  →  Controller  →  Service  →  Model
   ↑                                        │
   └──────────── View (HTML) ◄──────────────┘
```

- **`HotelController`** — recebe as requisições HTTP (`GET /`, `POST /reservar`, etc.) e decide qual página mostrar.
- **`HotelService`** — contém as regras de negócio: reservar, cancelar, registrar consumo. É aqui que fica a "lógica" do hotel.
- **`model/`** — classes simples que representam os dados (`Quarto`, `Hospede`, `ProdutoFrigobar`).
- **`templates/index.html`** — a página vista pelo usuário, escrita com **Thymeleaf** (permite usar `th:each`, `th:if`, etc. para gerar HTML dinâmico a partir dos dados do Java).

### O que dá pra fazer na página

- Reservar um quarto (número, nome, e-mail, telefone)
- Cancelar uma reserva
- Registrar consumo de um produto do frigobar em um quarto ocupado
- Ver o mapa de quartos (ocupado/livre) e a lista de produtos do frigobar em tempo real

> Atenção: os dados ficam só na memória (uma `List` dentro do `HotelService`). Se você reiniciar a aplicação, tudo volta ao estado inicial — não há banco de dados.

### Pontos para estudar no código

- `@SpringBootApplication` em `HotelApplication.java` — liga tudo (auto-configuração + escaneamento de componentes).
- `@Controller`, `@GetMapping`, `@PostMapping` em `HotelController.java` — como o Spring mapeia URLs para métodos Java.
- `@Autowired` — como o Spring injeta o `HotelService` dentro do `HotelController` automaticamente (Injeção de Dependência).
- `RedirectAttributes` + `redirect:/` — o padrão Post/Redirect/Get, usado para evitar reenvio de formulário ao atualizar a página.
- `th:each`, `th:if`, `th:text` em `index.html` — como o Thymeleaf percorre listas e mostra dados vindos do `Model`.

---

## Requisitos

- JDK 17 ou superior (para rodar a versão Spring Boot)
- JDK 8 ou superior (para rodar a versão console)
- Não precisa instalar o Maven — o projeto já inclui o `mvnw` (Maven Wrapper)
