-- ==========================================================
-- JavaHotel · estrutura do banco de dados (PostgreSQL)
-- Executado toda vez que o servidor inicia: só cria o que ainda não existe.
-- ==========================================================

-- Quartos do hotel (4 andares, 5 quartos por andar).
CREATE TABLE IF NOT EXISTS quarto (
    numero  INTEGER PRIMARY KEY CHECK (numero > 0),
    andar   INTEGER NOT NULL CHECK (andar > 0)
);

-- Hóspedes. O e-mail identifica a pessoa: uma nova reserva com o mesmo
-- e-mail reaproveita o cadastro (e atualiza nome e telefone).
CREATE TABLE IF NOT EXISTS hospede (
    id        SERIAL PRIMARY KEY,
    nome      VARCHAR(120) NOT NULL,
    email     VARCHAR(160) NOT NULL UNIQUE,
    telefone  VARCHAR(40)  NOT NULL
);

-- Reservas. O código mostrado no site (#0001) é o id com 4 dígitos.
-- O período vale de [entrada, saida): o dia da saída pode ser a entrada de outra reserva.
CREATE TABLE IF NOT EXISTS reserva (
    id             SERIAL PRIMARY KEY,
    quarto         INTEGER     NOT NULL REFERENCES quarto (numero),
    hospede_id     INTEGER     NOT NULL REFERENCES hospede (id),
    status         VARCHAR(12) NOT NULL DEFAULT 'agendada'
                   CHECK (status IN ('agendada', 'hospedada', 'finalizada')),
    entrada        DATE        NOT NULL,
    saida          DATE        NOT NULL,
    criada_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
    checkin_em     TIMESTAMPTZ,
    finalizada_em  TIMESTAMPTZ,
    CHECK (saida > entrada)
);

CREATE INDEX IF NOT EXISTS idx_reserva_quarto ON reserva (quarto);
CREATE INDEX IF NOT EXISTS idx_reserva_status ON reserva (status);

-- Produtos do frigobar e o estoque atual.
CREATE TABLE IF NOT EXISTS produto (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(80)   NOT NULL UNIQUE,
    preco       NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
    quantidade  INTEGER       NOT NULL CHECK (quantidade >= 0)
);

-- Cada produto lançado na conta de uma reserva. O preço fica gravado como era
-- no momento do consumo. O total do frigobar de uma reserva é a soma destas linhas.
CREATE TABLE IF NOT EXISTS consumo (
    id              SERIAL PRIMARY KEY,
    reserva_id      INTEGER       NOT NULL REFERENCES reserva (id) ON DELETE CASCADE,
    produto_id      INTEGER       NOT NULL REFERENCES produto (id),
    quantidade      INTEGER       NOT NULL CHECK (quantidade > 0),
    preco_unitario  NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
    lancado_em      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consumo_reserva ON consumo (reserva_id);
