# IPTV Stremio Addon

Este addon permite carregar listas IPTV em formato M3U no Stremio, transformando os canais em um catálogo que pode ser facilmente navegado e reproduzido.

## Funcionalidades

- Carrega qualquer arquivo M3U remoto via URL
- Extrai metadados como nome do canal, logo, e grupo
- Organiza os canais por grupos como géneros
- Fornece streaming direto dos canais

## Como usar localmente

1. Clone o repositório:
   ```
   git clone https://github.com/[seu-username]/iptv-stremio.git
   cd iptv-stremio
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Inicie o addon:
   ```
   npm start
   ```

4. Abra o Stremio e adicione o addon via URL:
   ```
   http://127.0.0.1:7000/manifest.json
   ```

## Hospedar gratuitamente no Vercel

Você pode hospedar este addon gratuitamente na Vercel seguindo estes passos:

### Preparação

1. Crie uma conta em [Vercel](https://vercel.com/) se ainda não tiver uma.

2. Instale o Vercel CLI:
   ```
   npm i -g vercel
   ```

### Configuração para Vercel

1. Crie um arquivo `vercel.json` na raiz do projeto:

   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/index.js"
       }
     ]
   }
   ```

2. Modifique o arquivo `index.js` para funcionar corretamente no ambiente serverless.
   Encontre a parte onde o servidor é iniciado e substitua por:

   ```javascript
   // Para desenvolvimento local
   if (process.env.NODE_ENV !== 'production') {
     serveHTTP(addon.getInterface(), { port: 7000 });
     console.log('Addon running at http://127.0.0.1:7000');
   }

   // Para Vercel (serverless)
   module.exports = async (req, res) => {
     const handle = addon.getInterface();
     await handle(req, res);
   };
   ```

### Implantação

1. Execute o login no Vercel pelo terminal:
   ```
   vercel login
   ```

2. Implante o projeto:
   ```
   vercel
   ```

3. Para implantações futuras, use:
   ```
   vercel --prod
   ```

4. Após a implantação, você receberá um URL (por exemplo, `https://seu-addon.vercel.app`).

## Como adicionar o Addon ao Stremio

1. Abra o Stremio no seu dispositivo.

2. Vá para a guia "Addons" no menu lateral.

3. Role até o final e clique em "Addon Community".

4. Clique no botão "Add Addon" no canto superior direito.

5. Cole a URL do seu addon seguida de `/manifest.json`:
   ```
   https://seu-addon.vercel.app/manifest.json
   ```

6. Após instalar, você encontrará o addon "M3U Loader" na lista de addons instalados.

7. Para usar, vá até o catálogo do addon e insira a URL do seu arquivo M3U quando solicitado.

## Como usar o Addon

1. Após adicionar o addon ao Stremio, vá para a guia "Discover" ou "Browse".

2. Selecione "M3U Streams" na lista de catálogos.

3. Quando solicitado, insira a URL completa do seu arquivo M3U (por exemplo: `https://exemplo.com/tv.m3u`).

4. O addon carregará os canais e exibirá como um catálogo com posters.

5. Clique em qualquer canal para começar a reprodução.

## Notas

- O arquivo M3U deve estar em um formato padrão com entradas `#EXTINF`.
- Para melhor experiência, use arquivos M3U com metadados completos (tvg-logo, tvg-name, group-title).
- Alguns serviços IPTV podem exigir autenticação na URL do M3U.

## Limitações

- Atualmente, o addon não suporta autenticação complexa.
- Playlistas muito grandes podem levar algum tempo para carregar.

## Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para enviar sugestões, relatar problemas ou enviar pull requests.

## Licença

MIT
