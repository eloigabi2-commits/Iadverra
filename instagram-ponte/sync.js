(async () => {
  const status = (fase, mensagem) =>
    chrome.storage.local.set({ ponteStatus: { fase, mensagem, quando: Date.now() } });
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

  function erroFatal(mensagem) {
    const e = new Error(mensagem);
    e.fatal = true;
    return e;
  }

  function cookie(nome) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + nome + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  const htmlDaPagina = () => document.documentElement.innerHTML;
  function doHtml(re) {
    const m = htmlDaPagina().match(re);
    return m ? m[1] : null;
  }

  function traduzir(mensagem) {
    if (/login_required/.test(mensagem)) return "Sua sessão do Instagram expirou. Entre de novo e sincronize.";
    if (/checkpoint_required|challenge_required/.test(mensagem)) {
      return "O Instagram pediu uma verificação. Abra o Instagram, confirme e tente de novo.";
    }
    if (/feedback_required/.test(mensagem)) return "O Instagram bloqueou temporariamente a consulta. Espere algumas horas.";
    return "O Instagram recusou a consulta. Entre de novo e tente outra vez.";
  }

  try {
    const armazenado = await chrome.storage.local.get(["ponteCodigo", "ponteApp"]);
    const codigo = armazenado.ponteCodigo;
    const app = String(armazenado.ponteApp || "").replace(/\/+$/, "");
    if (!codigo || !app) throw erroFatal("Abra a extensão e informe o código do painel.");

    const appId = doHtml(/"X-IG-App-ID":"([^"]+)"/) || "936619743392459";
    const csrf = cookie("csrftoken") || doHtml(/"csrf_token":"([^"]+)"/);
    const viewer = cookie("ds_user_id") || doHtml(/\\?"viewerId\\?":\\?"(\d+)\\?"/);
    if (!viewer) throw erroFatal("Você não está logado no Instagram nesta aba.");

    const cabecalhos = {
      "x-asbd-id": "359341",
      "x-ig-app-id": appId,
      "x-requested-with": "XMLHttpRequest",
    };
    if (csrf) cabecalhos["x-csrftoken"] = csrf;
    const claim = sessionStorage.getItem("www-claim-v2");
    if (claim) cabecalhos["x-ig-www-claim"] = claim;

    async function api(url, tentativas = 3) {
      for (let tentativa = 0; tentativa < tentativas; tentativa++) {
        if (tentativa > 0) await dormir(4000 + Math.random() * 4000);
        let resposta;
        try {
          resposta = await fetch(url, { headers: cabecalhos, credentials: "include" });
        } catch {
          throw new Error("Sem conexão com o Instagram.");
        }
        if (/\/accounts\/login|\/challenge/.test(resposta.url)) {
          throw erroFatal("Sua sessão caiu. Entre de novo no Instagram.");
        }
        if (resposta.status === 429) {
          await status("lento", "O Instagram pediu pausa. Aguardando...");
          await dormir(60_000);
          continue;
        }
        if (!resposta.ok) {
          let corpo = null;
          try {
            corpo = await resposta.json();
          } catch {}
          const mensagem = corpo && typeof corpo.message === "string" ? corpo.message : "";
          if (mensagem && /login_required|checkpoint_required|challenge_required|feedback_required/.test(mensagem)) {
            throw erroFatal(traduzir(mensagem));
          }
          if (resposta.status === 401 || resposta.status === 403) {
            throw erroFatal("O Instagram recusou a consulta. Entre de novo e tente outra vez.");
          }
          if (tentativa === tentativas - 1) throw new Error(`O Instagram respondeu ${resposta.status}.`);
          continue;
        }
        try {
          return await resposta.json();
        } catch {
          throw new Error("O Instagram não devolveu os dados esperados.");
        }
      }
      throw new Error("O Instagram não respondeu.");
    }

    async function listar(tipo) {
      const vistos = new Set();
      const saida = [];
      let truncado = false;
      let maxId = "";
      const rotulo = tipo === "followers" ? "seguidores" : "seguindo";
      for (let pagina = 0; pagina < 500; pagina++) {
        let url = `https://www.instagram.com/api/v1/friendships/${viewer}/${tipo}/?count=50`;
        url += tipo === "followers" ? "&search_surface=follow_list_page" : "&order=date_followed_latest";
        if (maxId) url += `&max_id=${encodeURIComponent(maxId)}`;
        const dados = await api(url);
        const usuarios = Array.isArray(dados.users) ? dados.users : [];
        for (const u of usuarios) {
          const id = String(u.pk ?? u.pk_id ?? "");
          if (!id || vistos.has(id)) continue;
          vistos.add(id);
          saida.push({
            id,
            username: u.username,
            nome: u.full_name || null,
            foto: u.profile_pic_url || null,
            privado: !!u.is_private,
            verificado: !!u.is_verified,
          });
          if (saida.length >= 10_000) break;
        }
        await status("lendo", `Lendo ${rotulo}: ${saida.length} perfis`);
        if (saida.length >= 10_000) {
          truncado = dados.has_more !== false;
          break;
        }
        const proximo = dados.next_max_id != null ? String(dados.next_max_id) : "";
        if (dados.has_more === false || !proximo) break;
        maxId = proximo;
        await dormir(1500 + Math.random() * 1500);
      }
      return { pessoas: saida, truncado };
    }

    async function lerPerfil() {
      let u = null;
      try {
        const dados = await api(`https://www.instagram.com/api/v1/users/${viewer}/info/`);
        u = dados && dados.user ? dados.user : dados;
      } catch (e) {
        if (e && e.fatal) throw e;
      }
      if (!u || !u.username) {
        const alt = await api("https://www.instagram.com/api/v1/accounts/current_user/?edit=true");
        u = alt && alt.user ? alt.user : alt;
      }
      if (!u || !u.username) throw new Error("Não consegui identificar seu perfil do Instagram.");
      return {
        id: String(u.pk ?? u.id ?? viewer),
        username: u.username,
        nome: u.full_name || null,
        foto: u.profile_pic_url || null,
        privado: !!u.is_private,
        verificado: !!u.is_verified,
      };
    }

    await status("lendo", "Lendo seu perfil...");
    const perfil = await lerPerfil();
    const listaSeguidores = await listar("followers");
    const listaSeguindo = await listar("following");
    const seguidores = listaSeguidores.pessoas;
    const seguindo = listaSeguindo.pessoas;

    let ids = [];
    try {
      const resposta = await fetch(
        `${app}/api/instagram/pendentes?codigo=${encodeURIComponent(codigo)}`,
        { cache: "no-store" }
      );
      if (resposta.ok) {
        const pendentes = await resposta.json();
        ids = Array.isArray(pendentes.ids) ? pendentes.ids.slice(0, 300) : [];
      }
    } catch {}

    const acessiveis = [];
    const inacessiveis = [];
    for (let i = 0; i < ids.length; i++) {
      if (i > 0) await dormir(900 + Math.random() * 900);
      await status("verificando", `Conferindo perfis que sumiram: ${i + 1}/${ids.length}`);
      try {
        const resposta = await fetch(`https://www.instagram.com/api/v1/users/${ids[i]}/info/`, {
          headers: cabecalhos,
          credentials: "include",
        });
        if (resposta.status === 429) {
          await dormir(30_000);
          continue;
        }
        if (resposta.status === 404) {
          inacessiveis.push(ids[i]);
          continue;
        }
        if (!resposta.ok) continue;
        const corpo = await resposta.json();
        if (corpo && corpo.user) acessiveis.push(ids[i]);
        else inacessiveis.push(ids[i]);
      } catch {}
    }

    await status("enviando", "Enviando as listas para o Iadverra...");
    const resposta = await fetch(`${app}/api/instagram/importar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo,
        perfil,
        seguidores,
        seguindo,
        acessiveis,
        inacessiveis,
        seguidoresTruncado: listaSeguidores.truncado,
      }),
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(corpo.erro || `O painel respondeu ${resposta.status}.`);

    await status(
      "pronto",
      `Pronto: ${corpo.seguidores} seguidores e ${corpo.seguindo} seguindo.` +
        (listaSeguidores.truncado ? " Lista truncada em 10 mil; não marquei saídas." : "") +
        " Abra o painel para ver."
    );
  } catch (e) {
    await status("erro", e && e.message ? e.message : String(e));
  }
})();
