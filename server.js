const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Requisições
app.use(cors());
app.use(express.json());

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Função para garantir criação da tabela
const initDatabase = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS partidas (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      movie_title VARCHAR(255) NOT NULL,
      attempts_used INTEGER NOT NULL,
      won_game BOOLEAN NOT NULL,
      played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createTableQuery);
    console.log('Tabela criada com sucesso.');
  } catch (error) {
    console.error('Erro ao criar a tabela no banco:', error.message);
  }
};

// Inicializa a tabela
initDatabase();

app.post('/api/matches', async (req, res) => {
  const { userId, movieTitle, attemptsUsed, wonGame } = req.body;

  // Validação dos dados recebidos
  if (!userId || !movieTitle || attemptsUsed === undefined || wonGame === undefined) {
    return res.status(400).json({ error: 'Todos os atributos são obrigatórios!' });
  }

  const insertQuery = `
    INSERT INTO partidas (user_id, movie_title, attempts_used, won_game)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  try {
    const result = await pool.query(insertQuery, [userId, movieTitle, attemptsUsed, wonGame]);
    
    // Retorna o objeto salvo com o ID gerado pelo banco e o timestamp
    return res.status(201).json({
      message: 'Partida salva com sucesso!',
      match: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao iniciar banco:', error.message);
    return res.status(500).json({ error: 'Erro ao salvar no banco de dados.' });
  }
});

app.get('/api/matches/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Busca as partidas passadas
    const result = await pool.query(
      'SELECT movie_title, attempts_used, won_game FROM partidas WHERE user_id = $1 ORDER BY played_at DESC',
      [userId]
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error.message);
    return res.status(500).json({ error: 'Erro ao buscar dados no banco.' });
  }
});

// Inicia o servidor Node
app.listen(port, () => {
  console.log(`backend on http://localhost:${port}`);
});