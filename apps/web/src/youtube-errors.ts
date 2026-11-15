export function youtubeErrorMessage(code: unknown, hostname: string) {
  const suffix = typeof code === "number" ? ` (YouTube ${code})` : "";
  if (code === 2)
    return `O player recebeu um identificador de vídeo inválido${suffix}. Cancele por falha e adicione a música novamente.`;
  if (code === 5)
    return `O navegador não conseguiu reproduzir o vídeo${suffix}. Recarregue o palco ou teste outro navegador.`;
  if (code === 100)
    return `Este vídeo foi removido, está privado ou não foi encontrado${suffix}. O anfitrião pode cancelar por falha e escolher outro.`;
  if (code === 153)
    return `O YouTube não identificou a origem do palco${suffix}. Abra o endereço configurado da aplicação e confira se o navegador permite enviar Referer.`;
  if (code === 101 || code === 150) {
    const ipAddress =
      /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith("[");
    return ipAddress
      ? `O YouTube recusou a reprodução incorporada${suffix}. Isso pode acontecer ao acessar por IP; abra o endereço com nome configurado para a rede local.`
      : `O YouTube recusou a reprodução incorporada deste vídeo${suffix}. O anfitrião pode cancelar por falha e escolher outro.`;
  }
  return `O player do YouTube encontrou uma falha${suffix}. Verifique a conexão; o anfitrião pode cancelar por falha e tentar novamente.`;
}
