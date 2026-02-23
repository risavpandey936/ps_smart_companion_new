# Step 1: Build the React app
FROM node:18-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# We pass the API URL at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# We use a shell command to replace the listen port in the default nginx config
# This allows the app to run on the port provided by the hosting environment (Railway)
CMD ["sh", "-c", "sed -i 's/listen[[:space:]]*80;/listen '\"$PORT\"';/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
