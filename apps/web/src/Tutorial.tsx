import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icons";
import { Brand } from "./Branding";
import "./tutorial.css";

const steps = [
  {
    id: "preparar",
    title: "Separe as telas",
    content: (
      <>
        <p>
          Use uma TV ou um computador como palco e os celulares como controles.
          Um dos jogadores será o anfitrião, que organiza a sala.
        </p>
        <ul>
          <li>Abra o endereço do Karaoke Míque em cada aparelho.</li>
          <li>Mantenha acesso à internet para carregar vídeos e GIFs.</li>
          <li>
            Deixe o som da TV ou do computador ligado. Os celulares não precisam
            reproduzir a música.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "criar",
    title: "Crie a sala no seu celular",
    content: (
      <>
        <p>Quem vai organizar a festa começa por aqui:</p>
        <ol>
          <li>
            Na tela inicial, toque em <strong>Criar uma sala</strong>.
          </li>
          <li>
            Escolha o nome da sala, informe seu apelido e selecione um avatar.
          </li>
          <li>
            Toque em <strong>Criar minha sala</strong>. Você se torna o
            anfitrião.
          </li>
        </ol>
        <p>
          Guarde essa aba aberta no celular: é por ela que você controla o
          palco.
        </p>
      </>
    ),
  },
  {
    id: "tv",
    title: "Conecte a TV ao palco",
    content: (
      <>
        <ol>
          <li>
            Na TV ou no computador, abra o mesmo endereço e escolha{" "}
            <strong>Usar como palco</strong>.
          </li>
          <li>
            A TV mostra um QR code e um código de seis dígitos. Escaneie esse QR
            com o celular do anfitrião e confirme a sala.
          </li>
          <li>
            Se preferir digitar, no celular entre em{" "}
            <strong>Palco → Conectar ou reconfigurar TV</strong>, informe os
            seis dígitos e toque em <strong>Conectar TV</strong>.
          </li>
        </ol>
        <p>
          A TV abre a apresentação automaticamente. O QR que passa a aparecer no
          palco serve para os jogadores entrarem na sala.
        </p>
        <p>
          Vai usar o próprio computador como palco? Na aba{" "}
          <strong>Palco</strong> do anfitrião, abra a área de conexão e escolha{" "}
          <strong>Usar esta tela como palco</strong>.
        </p>
        <p className="tutorial-tip">
          Para tirar as barras do navegador, use a opção de tela cheia da TV ou
          F11 no computador. Se aparecer <strong>Ativar som e iniciar</strong>,
          faça esse primeiro toque na própria TV para liberar o áudio.
        </p>
      </>
    ),
  },
  {
    id: "entrar",
    title: "Chame os outros jogadores",
    content: (
      <>
        <ol>
          <li>
            Cada pessoa aponta a câmera do celular para o QR code que está no
            palco.
          </li>
          <li>
            Informa seu apelido, escolhe um avatar e toca em{" "}
            <strong>Entrar na sala</strong>.
          </li>
        </ol>
        <p>
          Sem câmera? Na tela inicial, escolha <strong>Tenho um código</strong>{" "}
          e digite o código da sala, mostrado ao lado do QR no palco.
        </p>
        <p>
          O código de seis dígitos conecta a TV. O código de oito caracteres
          identifica a sala para os jogadores.
        </p>
      </>
    ),
  },
  {
    id: "musicas",
    title: "Escolha sua música",
    content: (
      <>
        <ol>
          <li>
            No celular, entre em <strong>Buscar</strong>. A lista já traz ideias
            de músicas.
          </li>
          <li>
            Toque em <strong>Outras ideias</strong> para variar o tema, ou
            digite uma música/artista e toque em <strong>Buscar</strong>. Não
            precisa escrever “karaoke”: o sistema acrescenta isso.
          </li>
          <li>
            Confira o título e o canal, toque em <strong>Adicionar</strong> e
            depois em <strong>Confirmar</strong>.
          </li>
        </ol>
        <p>
          Depois de pesquisar, <strong>Ver sugestões</strong> volta às ideias.
          Em <strong>Minhas músicas</strong> você consulta ou remove seus
          pedidos pendentes. O anfitrião encontra{" "}
          <strong>Gerenciar músicas da sala</strong> na área Palco ou Gerenciar.
        </p>
      </>
    ),
  },
  {
    id: "cantar",
    title: "Acompanhe sua vez e solte a voz",
    content: (
      <>
        <p>
          A ordem de <strong>Próximas vozes</strong> aparece na TV. Quem cantou
          menos canta antes e, entre os seus pedidos, sai primeiro o mais
          antigo.
        </p>
        <p>
          Com o palco conectado e <strong>Tocar fila automaticamente</strong>{" "}
          ativado, as músicas começam sem o anfitrião precisar iniciar uma por
          uma. O título e o nome de quem canta ficam no topo do palco.
        </p>
        <p>
          Se chegar alguém que cantou menos, essa pessoa pode passar na sua
          frente. E pedir várias músicas não garante cantar várias seguidas.
        </p>
      </>
    ),
  },
  {
    id: "votar",
    title: "Vote, veja a nota e entenda o bis",
    content: (
      <>
        <ol>
          <li>Quando a música terminar, a votação aparece nos celulares.</li>
          <li>
            Escolha uma nota de <strong>0 a 10</strong> e toque em{" "}
            <strong>Confirmar nota</strong>. Você tem até{" "}
            <strong>dez segundos</strong>; a rodada pode terminar antes se todos
            votarem.
          </li>
          <li>
            Acompanhe a revelação da média no palco, com a reação do mascote.
            Quem está cantando não vota em si.
          </li>
        </ol>
        <p>
          Se todos os votos recebidos forem 10, com pelo menos dois votos e uma
          música sua já na fila, você pode receber uma oferta de bis. Toque em{" "}
          <strong>Quero um bis!</strong> para promover esse pedido ou em{" "}
          <strong>Agora não</strong> para manter a ordem normal.
        </p>
        <p className="tutorial-tip">
          Depois de usar um bis, precisam ser concluídas{" "}
          <strong>quatro músicas</strong> para você poder ganhar outra
          prioridade com uma nova nota perfeita. O próprio bis, músicas puladas
          e canceladas não contam. Se ninguém votar, a apresentação fica sem
          nota e a festa continua.
        </p>
      </>
    ),
  },
  {
    id: "reagir",
    title: "Mande energia com emojis e GIFs",
    content: (
      <>
        <p>
          Na aba <strong>Sala</strong>, toque em um emoji para mandá-lo ao
          palco. Ele aparece sobre a apresentação e desaparece sozinho.
        </p>
        <ol>
          <li>
            Em <strong>GIFs da galera</strong>, toque em{" "}
            <strong>Buscar um GIF</strong> ou <strong>Expandir GIFs</strong>.
          </li>
          <li>
            Digite uma reação, toque em <strong>Buscar GIFs</strong> e escolha
            uma imagem para enviá-la.
          </li>
          <li>
            Use <strong>Minimizar GIFs</strong> para recolher a busca e deixar o
            celular mais limpo.
          </li>
        </ol>
        <p>
          O GIF aparece na lateral do palco com o nome de quem enviou. A
          confirmação de envio é um aviso discreto no topo do celular. O
          anfitrião pode desativar reações ou GIFs.
        </p>
      </>
    ),
  },
  {
    id: "anfitriao",
    title: "Organize a festa pelo celular",
    content: (
      <>
        <p>
          Na aba <strong>Palco</strong>, o anfitrião pode:
        </p>
        <ul>
          <li>Ativar ou desativar o avanço automático da fila.</li>
          <li>Preparar, pausar ou retomar uma apresentação.</li>
          <li>
            <strong>Pular música</strong> ou <strong>Cancelar por falha</strong>
            . O cancelamento técnico devolve um turno que já tenha sido
            consumido; pular uma música iniciada mantém esse turno.
          </li>
          <li>
            Ajustar o som da revelação, permitir reações/GIFs e mudar o tamanho
            do GIF na TV.
          </li>
          <li>
            Conectar ou reconfigurar a TV. Um novo pareamento substitui o palco
            anterior.
          </li>
        </ul>
        <p>
          Na aba <strong>Gerenciar</strong>, pode permitir novas entradas,
          remover participantes ou transferir o comando da sala. A TV fica
          somente com a apresentação; os ajustes ficam no celular.
        </p>
      </>
    ),
  },
  {
    id: "encerrar",
    title: "Retome se precisar e encerre no final",
    content: (
      <>
        <p>
          Se a conexão cair, aguarde a reconexão usando o mesmo navegador. Evite
          limpar os dados do navegador durante a festa, pois eles guardam seu
          acesso à sala.
        </p>
        <p>
          Se o palco entrar em recuperação, o anfitrião deve reconectar ou
          parear a TV e usar <strong>Iniciar / retomar</strong>. Se um vídeo não
          funcionar, pode cancelar por falha e escolher outro.
        </p>
        <p>
          Ao terminar, entre em{" "}
          <strong>Gerenciar → Encerrar sala → Confirmar</strong>. Para rever as
          apresentações, use <strong>Ver os shows da noite</strong>. O resumo
          fica disponível por até 24 horas após o encerramento.
        </p>
      </>
    ),
  },
];

const top = () => window.scrollTo({ top: 0, behavior: "instant" });
export function Tutorial() {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    top();
    title.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="tutorial-shell">
      <header className="tutorial-header">
        <Link to="/" onClick={top}>
          <Icon name="arrow" />
          Voltar ao início
        </Link>
        <Brand />
      </header>
      <main>
        <div className="tutorial-intro">
          <h1 ref={title} tabIndex={-1}>
            Da primeira sala
            <br />
            ao último bis.
          </h1>
          <p>
            Como colocar a festa na TV e entrar pelo celular. Siga do começo ou
            pule direto para a parte em que você travou.
          </p>
        </div>
        <div className="tutorial-layout">
          <nav aria-label="Etapas do tutorial">
            <h2>Por onde começar?</h2>
            <ol>
              {steps.map((step) => (
                <li key={step.id}>
                  <a href={`#${step.id}`}>{step.title}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div>
            <ol className="tutorial-steps">
              {steps.map((step, i) => (
                <li key={step.id}>
                  <section id={step.id} aria-labelledby={`title-${step.id}`}>
                    <h2 id={`title-${step.id}`}>
                      <span aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {step.title}
                    </h2>
                    {step.content}
                  </section>
                </li>
              ))}
            </ol>
            <section className="tutorial-help" aria-label="Ajuda rápida">
              <h2>Algo ainda não funcionou?</h2>
              <details>
                <summary>O celular não abre a sala</summary>
                <p>
                  Confira a conexão com a internet, o endereço do site e o
                  código da sala. Peça ao anfitrião para conferir se a sala
                  continua aceitando novas pessoas.
                </p>
              </details>
              <details>
                <summary>O vídeo não toca ou está sem som</summary>
                <p>
                  Confira a internet, o volume e se o navegador pede um primeiro
                  toque para liberar o áudio. Use o endereço configurado para o
                  sistema. Se o vídeo tiver restrição, o anfitrião pode cancelar
                  por falha e pedir outro.
                </p>
              </details>
              <details>
                <summary>A busca ou os GIFs estão indisponíveis</summary>
                <p>
                  O serviço pode estar sem conexão ou temporariamente
                  indisponível. Tente novamente mais tarde. As músicas já na
                  fila continuam na sala; se os GIFs falharem, você ainda pode
                  usar emojis quando as reações estiverem permitidas.
                </p>
              </details>
            </section>
            <section className="tutorial-ready">
              <h2>Agora é só soltar a voz.</h2>
              <div className="actions">
                <Link className="button" to="/rooms/new" onClick={top}>
                  Criar uma sala
                  <Icon name="arrow" />
                </Link>
                <Link className="button secondary" to="/join" onClick={top}>
                  Tenho um código
                </Link>
              </div>
              <Link to="/" onClick={top}>
                Voltar ao início
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
