FROM node:24-alpine

WORKDIR /rlonrails

COPY package-lock.json package.json /rlonrails/

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "dev"]
