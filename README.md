# AutoMiner

AutoMiner é um mod Fabric para Minecraft Java Edition 1.21.1, acompanhado por um Manager desktop para instalação, configuração e diagnóstico local.

## Requisitos

- Minecraft Java Edition 1.21.1
- Fabric Loader compatível com 1.21.1
- Windows 10 ou superior para o AutoMiner Manager

## Instalação

Baixe `AutoMiner-Setup.exe` e execute o instalador. Ele não exige Node.js, Rust, Cargo ou Gradle. O Manager detecta o Game Directory, preserva outros mods e instala o AutoMiner, Fabric Loader e Fabric API compatíveis.

Também é possível instalar manualmente o JAR `autominer-1.0.0.jar` na pasta `mods` de uma instalação Fabric 1.21.1.

## Uso e configuração

Abra o Manager para verificar a instalação e configurar o comportamento de mineração. O mod fornece telemetria ao Manager enquanto o Minecraft estiver em execução; sem conexão, o aplicativo mostra os dados como indisponíveis em vez de estimá-los.

## Verificação dos downloads

Cada release publica checksums SHA-256. Em Linux/macOS, use `sha256sum --check SHA256SUMS.txt`; no Windows, compare o valor de `Get-FileHash -Algorithm SHA256 <arquivo>` com o arquivo de checksum.

## Build

O mod é compilado com Java 21 e Gradle Wrapper. O Manager é compilado com Next.js e Tauri. A release oficial é produzida pelo GitHub Actions ao publicar uma tag `v*`; o pipeline valida o JAR, o instalador, os checksums e o manifest antes de publicar.

## Servidores e responsabilidade

Verifique as regras do servidor antes de usar automação. O usuário é responsável por respeitar os termos do servidor e do Minecraft. AutoMiner não é afiliado à Mojang Studios ou Microsoft.

## Publicação v1.0.0

Após revisar as mudanças, configure o remote e execute:

```text
git add .
git commit -m "Prepare v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

A tag `v1.0.0` dispara `.github/workflows/release.yml`.

## Licença

MIT. Consulte `LICENSE`.
