-- ==========================================================
-- JavaHotel · dados iniciais
-- Só insere quando a tabela está vazia, então pode rodar a cada início
-- sem duplicar nada. Também é usado por "Restaurar dados de exemplo".
-- ==========================================================

-- 20 quartos: 1 a 5 no 1º andar, 6 a 10 no 2º, e assim por diante.
INSERT INTO quarto (numero, andar)
SELECT n, (n - 1) / 5 + 1
FROM generate_series(1, 20) AS n
WHERE NOT EXISTS (SELECT 1 FROM quarto);

INSERT INTO produto (nome, preco, quantidade)
SELECT nome, preco, quantidade
FROM (VALUES
    (1, 'Água Mineral 500ml', 3.50, 20),
    (2, 'Refrigerante Lata',  6.00, 15),
    (3, 'Suco de Laranja',    7.00, 10),
    (4, 'Cerveja Long Neck',  9.00, 12),
    (5, 'Chocolate ao Leite', 5.50, 18)
) AS inicial (ordem, nome, preco, quantidade)
WHERE NOT EXISTS (SELECT 1 FROM produto)
ORDER BY ordem;
