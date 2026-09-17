# ==========================================
# Stage 1: Build Frontend Web (React + Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY bpotime-web/package*.json ./
RUN npm install

COPY bpotime-web/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend (.NET 8 Web API)
# ==========================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-builder
WORKDIR /src

# Copy project files for caching restore layers
COPY src/BPOTime.Domain/*.csproj ./src/BPOTime.Domain/
COPY src/BPOTime.Application/*.csproj ./src/BPOTime.Application/
COPY src/BPOTime.Infrastructure/*.csproj ./src/BPOTime.Infrastructure/
COPY src/BPOTime.Api/*.csproj ./src/BPOTime.Api/

RUN dotnet restore ./src/BPOTime.Api/BPOTime.Api.csproj

# Copy remaining source code
COPY src/ ./src/

# Copy built frontend into wwwroot
COPY --from=frontend-builder /app/src/BPOTime.Api/wwwroot ./src/BPOTime.Api/wwwroot/

# Publish Release
WORKDIR /src/src/BPOTime.Api
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# ==========================================
# Stage 3: Runtime Container
# ==========================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Ensure logs directory exists
RUN mkdir -p /app/logs

COPY --from=backend-builder /app/publish ./

ENV PORT=8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "BPOTime.Api.dll"]
