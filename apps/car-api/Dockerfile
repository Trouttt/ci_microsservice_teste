# Use a imagem oficial do Node.js como base
FROM node:latest

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# Copie os arquivos do aplicativo para o diretório de trabalho do contêiner
COPY . .

# Instale as dependências do aplicativo
RUN npm install

# Expõe a porta 3000 para permitir acesso à aplicação
EXPOSE 3003

# Comando para iniciar a aplicação quando o contêiner for iniciado
CMD ["node", "index.js"]