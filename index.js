const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

const apiUrl = 'https://66e4d2bad2405277ed155689.mockapi.io/ped/remedios';

const chatGptApiKey = 'API_KEY';

const retryRequest = async (requestFunc, retries, delay) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFunc();
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || delay;
        console.log(`Limite de requisições atingido. Tentando novamente em ${retryAfter} segundos...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Excedeu o número máximo de tentativas');
};

app.post('/ask', async (req, res) => {
  const userQuery = req.body.query;

  const requestFunc = () => {
    return axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userQuery }],
        max_tokens: 150,
      },
      {
        headers: {
          'Authorization': `Bearer ${chatGptApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  };

  try {

    const gptResponse = await retryRequest(requestFunc, 3, 60);
    const gptMessage = gptResponse.data.choices[0].message.content;
    let result;


    if (gptMessage.includes('remédios')) {

      const apiResponse = await axios.get(apiUrl);
      result = apiResponse.data;
    } else {
      result = 'Desculpe, não consegui entender sua pergunta.';
    }
    res.json({ gptMessage, result });

  } catch (error) {
    console.error(error);
    res.status(500).send('Erro na comunicação com a API do ChatGPT ou com a API mock.');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
