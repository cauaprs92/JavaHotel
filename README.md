<div align="center">

# 🏨 JavaHotel

### Sistema de reservas de hotel com frigobar

<a href="https://javahotel-two.vercel.app/">
  <img src="https://img.shields.io/badge/🌐_ACESSAR_SITE-javahotel--two.vercel.app-2563eb?style=for-the-badge&labelColor=0f172a" alt="Acessar site" />
</a>

<br/><br/>

[![Java](https://img.shields.io/badge/Java-25-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-JDBC-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)](https://javahotel-two.vercel.app/)

</div>

---

## 🚪 Duas formas de usar

| | 🌐 Site publicado | 💻 Local com banco de dados |
| --- | --- | --- |
| **Onde** | [javahotel-two.vercel.app](https://javahotel-two.vercel.app/) | `http://localhost:8081`, na sua máquina |
| **Branch** | `main` | `feat/banco-de-dados-postgresql` |
| **Onde ficam os dados** | No navegador de quem usa (`localStorage`) | No banco **PostgreSQL** |
| **Precisa instalar algo?** | Não, é só abrir o link | Sim: Java 25 e PostgreSQL ([tutorial abaixo](#-rodando-localmente-com-banco-de-dados)) |

As duas têm as mesmas telas e as mesmas regras. A diferença é onde os dados ficam: no site publicado, cada navegador guarda as suas reservas; na versão local, tudo é gravado no banco de dados e qualquer aba ou navegador vê as mesmas reservas.

> Por enquanto, a versão com banco de dados roda **apenas localmente**. O site da Vercel continua sendo a versão estática da branch `main`.

---

## ✨ O que dá pra fazer no site

- ✅ Reservar um quarto com **data de check-in e check-out**: a reserva ganha um **código de reserva** único (#0001, #0002…) e começa com o status **Agendado**
- ✅ Reservar um quarto que já está ocupado, para datas futuras: só aparecem os quartos livres no período escolhido, e o sistema não aceita períodos que se sobrepõem (o dia da saída de um hóspede pode ser o dia da entrada do próximo)
- ✅ Fazer o check-in: o status passa para **Hospedado**
- ✅ Encerrar a reserva confirmando o pagamento do frigobar: o status passa para **Finalizado** e ela fica no histórico
- ✅ Cancelar um agendamento (antes do check-in)
- ✅ Editar os dados do hóspede ou trocar de quarto
- ✅ Telefone sempre no formato `(11) 90000-0000` (celular) ou `(11) 3000-0000` (fixo)
- ✅ Buscar reservas pelo código (`#0003`), hóspede, telefone ou quarto, filtrar por status, andar e consumo, e ordenar pelo código
- ✅ Lançar vários produtos do frigobar de uma vez em um quarto com hóspede no hotel
- ✅ Ver o mapa de quartos (livre, agendado ou hospedado) e o estoque do frigobar

```
Agendado ──check-in──▶ Hospedado ──encerrar (pagamento do frigobar)──▶ Finalizado
    └──cancelar agendamento──▶ (removida)
```

---

## 🌐 Acessando o site publicado

Abra **[javahotel-two.vercel.app](https://javahotel-two.vercel.app/)**. Não precisa instalar nada.

Os dados ficam salvos só no navegador que você está usando. Em outro navegador ou computador, as reservas não aparecem. O botão **Restaurar dados de exemplo**, no rodapé, apaga tudo e recomeça.

---

## 💻 Rodando localmente com banco de dados

### 1. Instale o que precisa

| Programa | Para quê | Onde baixar |
| --- | --- | --- |
| **Git** | Baixar o projeto | [git-scm.com](https://git-scm.com/downloads) |
| **JDK 25** | Rodar o servidor Java | [Adoptium Temurin 25](https://adoptium.net/temurin/releases/?version=25) |
| **PostgreSQL** | O banco de dados | [postgresql.org/download](https://www.postgresql.org/download/) |

Durante a instalação do PostgreSQL:
- **Anote a senha** que você criar para o usuário `postgres`. Ela vai ser usada no passo 4.
- Deixe a porta padrão, **5432**.
- O instalador também traz o **pgAdmin**, um programa visual para mexer no banco.

Para conferir o Java, abra um terminal e rode `java -version`. Precisa aparecer **25**.

> 💡 Se aparecer outra versão, mas você usa o VS Code com a extensão **Language Support for Java (Red Hat)**, ela já traz um JDK 25. Aponte o `JAVA_HOME` para ele (no PowerShell, ajuste o número da versão da extensão):
> ```powershell
> $env:JAVA_HOME = "$env:USERPROFILE\.vscode\extensions\redhat.java-1.58.0-win32-x64\jre\25.0.4.1-win32-x86_64"
> ```
> Para não precisar repetir em todo terminal, use `setx JAVA_HOME "<o mesmo caminho>"` uma vez e abra um terminal novo.

### 2. Baixe o projeto e entre na branch do banco

```bash
git clone https://github.com/cauaprs92/JavaHotel.git
cd JavaHotel
git checkout feat/banco-de-dados-postgresql
```

### 3. Crie o banco `javahotel`

**Pelo pgAdmin:** abra o pgAdmin, entre em *Servers → PostgreSQL*, digite a senha, clique com o botão direito em *Databases → Create → Database…*, coloque o nome `javahotel` e salve.

**Ou pelo terminal (`psql`):**
```bash
psql -U postgres -c "CREATE DATABASE javahotel;"
```

Só precisa criar o banco vazio. As tabelas, os 20 quartos e os produtos do frigobar são criados sozinhos na primeira vez que o servidor iniciar.

### 4. Coloque a senha do banco

Copie o arquivo de modelo:

```bash
# Windows (PowerShell)
Copy-Item banco.example.properties banco.properties

# Linux / macOS
cp banco.example.properties banco.properties
```

Abra o `banco.properties` e troque `SUA_SENHA_AQUI` pela senha do passo 1:

```properties
javahotel.bd.url=jdbc:postgresql://localhost:5432/javahotel
javahotel.bd.usuario=postgres
javahotel.bd.senha=SUA_SENHA_AQUI
```

O `banco.properties` fica fora do git, então sua senha não vai para o GitHub.

### 5. Inicie o servidor

Na pasta do projeto:

```bash
# Windows (PowerShell)
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```

Na primeira vez demora um pouco, porque o Maven baixa as dependências. Espere aparecer:

```
Banco de dados pronto em jdbc:postgresql://localhost:5432/javahotel
```

### 6. Abra o site

Acesse **http://localhost:8081**. Tudo o que você fizer fica gravado no PostgreSQL. Dá para ver as tabelas pelo pgAdmin, em *javahotel → Schemas → public → Tables*.

Para desligar o servidor, aperte **Ctrl + C** no terminal. Os dados continuam salvos no banco; da próxima vez, é só repetir o passo 5.

### Se algo der errado

| Mensagem | O que fazer |
| --- | --- |
| *O banco de dados não existe* | Faça o passo 3. |
| *Usuário ou senha do banco de dados incorretos* | Confira a senha no `banco.properties` (passo 4). |
| *Não foi possível conectar ao PostgreSQL* | O PostgreSQL está desligado. No Windows, abra *Serviços*, procure **postgresql** e clique em *Iniciar*. |
| *Port 8081 was already in use* | O servidor já está rodando em outro terminal. Use esse ou feche ele. |
| `release version 25 not supported` ou erro de versão do Java | O Maven está usando um Java antigo. Veja a dica do `JAVA_HOME` no passo 1. |
| Na página: *Não foi possível carregar os dados do banco de dados* | O servidor não está rodando, ou o banco está com problema. Veja a mensagem no terminal. |

---

## 🧱 Como funciona a versão com banco de dados

```
Navegador (public/)          Servidor Java (Spring Boot)                     Banco
┌───────────────────┐  HTTP  ┌───────────────────┐   ┌──────────────┐  JDBC  ┌────────────┐
│ index, quartos,   │ ─────▶ │ HotelApiController│ ─▶│ HotelService │ ─────▶ │ PostgreSQL │
│ reservas, frigobar│ ◀───── │   (/api/...)      │   │  (regras)    │  DAOs  │ javahotel  │
│ app.js            │  JSON  └───────────────────┘   └──────────────┘        └────────────┘
└───────────────────┘
```

- **Navegador** (`public/app.js`): busca tudo em `GET /api/estado` e envia cada ação (reservar, check-in, consumo…) para a API. Mostra a mensagem que o servidor devolve.
- **HotelService**: confere as regras do hotel (quarto livre, datas, telefone, estoque, pagamento) e faz cada operação dentro de uma **transação**: se algo falhar no meio, nada é gravado (`rollback`). Antes de alterar, trava a tabela de reservas para escrita, para que duas pessoas não reservem o mesmo quarto ao mesmo tempo.
- **DAOs** (`com.hotel.dao`): todo o acesso ao banco, com JDBC puro: `DriverManager`, `Connection`, `PreparedStatement` e `ResultSet`. Os erros de banco (`SQLException`) viram mensagens claras para a tela.

### Tabelas

| Tabela    | Guarda                                                                  |
| --------- | ----------------------------------------------------------------------- |
| `quarto`  | Os 20 quartos e o andar de cada um                                      |
| `hospede` | Nome, e-mail e telefone (o e-mail identifica a pessoa)                  |
| `reserva` | Quarto, hóspede, status, entrada, saída e as datas de check-in e saída  |
| `produto` | Produtos do frigobar, preço e estoque                                   |
| `consumo` | Cada produto lançado na conta de uma reserva, com o preço do momento    |

O total do frigobar de uma reserva é a soma das linhas de `consumo`. A estrutura completa está em [`schema.sql`](src/main/resources/banco/schema.sql).

### API

| Método   | Rota                            | O que faz                         |
| -------- | ------------------------------- | --------------------------------- |
| `GET`    | `/api/estado`                   | Quartos, reservas e produtos      |
| `POST`   | `/api/reservas`                 | Nova reserva (Agendado)           |
| `PUT`    | `/api/reservas/{id}`            | Edita hóspede, quarto e datas     |
| `POST`   | `/api/reservas/{id}/checkin`    | Agendado → Hospedado              |
| `POST`   | `/api/reservas/{id}/finalizar`  | Hospedado → Finalizado            |
| `DELETE` | `/api/reservas/{id}`            | Cancela um agendamento            |
| `POST`   | `/api/consumos`                 | Lança produtos do frigobar        |
| `POST`   | `/api/redefinir`                | Restaura os dados de exemplo      |

As alterações respondem `{ "ok": true, "msg": "..." }`; quando uma regra não é atendida, `{ "ok": false, "msg": "..." }` com status 400.

---

## 📁 Estrutura do projeto

```
JavaHotel/
├── public/                          # Site (HTML, CSS e app.js)
├── src/main/java/com/hotel/
│   ├── controller/                  # API REST (HotelApiController) e tratamento de erros
│   ├── service/                     # Regras do hotel e transações (HotelService)
│   ├── dao/                         # JDBC: ConexaoBD, InicializadorBD e um DAO por tabela
│   └── model/                       # Quarto, Hospede, Reserva, ProdutoFrigobar...
├── src/main/resources/
│   ├── application.properties       # Porta e configuração do banco
│   └── banco/                       # schema.sql (tabelas) e dados-iniciais.sql
├── banco.example.properties         # Modelo do arquivo com a senha do banco
└── console-app/                     # Primeira versão, em Java puro para terminal (referência de estudo)
```
