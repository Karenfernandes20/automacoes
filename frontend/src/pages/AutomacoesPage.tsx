import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  History,
  Layers3,
  MessageCircle,
  PackageSearch,
  PlayCircle,
  Plus,
  Save,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { api } from "../lib/api";
import { useOffers } from "../hooks/useOffers";
import { money } from "../lib/format";

type View = "list" | "wizard" | "history";
type Step = 1 | 2 | 3 | 4 | 5 | 6;
type Group = { id: string; name: string; members: number; status: string };
type CatalogProduct = {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  marketplace: "Mercado Livre" | "Shopee";
  offerType?: "Oferta" | "Oferta Relâmpago";
};
type Automation = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
  days: string[];
  interval: number;
  startTime: string;
  endTime: string;
  groupIds: string[];
  message: string;
  productsPerRun: number;
  order: string;
  sources: string[];
  categories: string[];
  negativeWords: string;
  noRepeatHours: number;
  shopeeVideos: boolean;
  shopeeOfferTypes: string[];
};

const week = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const steps = [
  { n: 1, label: "Identidade", icon: Box },
  { n: 2, label: "Agenda", icon: CalendarDays },
  { n: 3, label: "Grupos", icon: Users },
  { n: 4, label: "Conteúdo", icon: MessageCircle },
  { n: 5, label: "Shopee Vídeos", icon: Video },
  { n: 6, label: "Regras", icon: Settings2 },
] as const;
const categories = [
  "Acessórios para Veículos",
  "Agro",
  "Alimentos e Bebidas",
  "Animais",
  "Bebês",
  "Beleza e Cuidado Pessoal",
  "Casa e Decoração",
  "Celulares e Telefones",
  "Eletrônicos",
  "Esportes e Fitness",
  "Ferramentas",
  "Informática",
  "Moda",
  "Saúde",
];
const blank = (): Automation => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  active: true,
  createdAt: new Date().toISOString(),
  days: [...week],
  interval: 30,
  startTime: "00:00",
  endTime: "23:59",
  groupIds: [],
  message:
    "🔥 *{produto}*\n\nDe ~R$ {preco_anterior}~ por *R$ {preco}*\n\n🛒 Garanta aqui: {link}",
  productsPerRun: 3,
  order: "Mais vendidos",
  sources: ["Mercado Livre"],
  categories: [],
  negativeWords: "",
  noRepeatHours: 24,
  shopeeVideos: false,
  shopeeOfferTypes: ["Oferta", "Oferta Relâmpago"],
});

export function AutomacoesPage() {
  const { offers } = useOffers();
  const [view, setView] = useState<View>("list");
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Automation>(blank());
  const [saved, setSaved] = useState<Automation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("central_automations") || "[]");
    } catch {
      return [];
    }
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [sourceTab, setSourceTab] = useState<
    "categories" | "types" | "keywords"
  >("categories");
  const [feedback, setFeedback] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [catalogTotals, setCatalogTotals] = useState({
    mercadoLivre: 0,
    shopee: 0,
    shopeeFlash: 0,
  });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    localStorage.setItem("central_automations", JSON.stringify(saved));
  }, [saved]);
  useEffect(() => {
    if (view === "wizard" && step === 3 && !groups.length) {
      setGroupLoading(true);
      api
        .getWuzapiGroups()
        .then((r) => setGroups(r.groups || []))
        .finally(() => setGroupLoading(false));
    }
  }, [view, step, groups.length]);
  useEffect(() => {
    if (view !== "wizard" || step !== 5 || catalogLoaded || catalogLoading)
      return;
    setCatalogLoading(true);
    setCatalogError("");
    Promise.allSettled([
      api.searchMercadoLivreCatalog({ page: 1, limit: 48 }),
      api.getShopeeTopOffers(1, 48),
      api.getShopeeTopOffers(1, 48, "oferta relâmpago"),
    ])
      .then(([ml, shopee, shopeeFlash]) => {
        const products: CatalogProduct[] = [];
        let mercadoLivre = 0;
        let shopeeTotal = 0;
        if (ml.status === "fulfilled") {
          mercadoLivre = ml.value.paging.total;
          products.push(
            ...ml.value.items.map((item) => ({
              id: item.id,
              title: item.title,
              price: item.price,
              imageUrl: item.imageUrl,
              marketplace: "Mercado Livre" as const,
            })),
          );
        }
        if (shopee.status === "fulfilled") {
          shopeeTotal = shopee.value.total;
          products.push(
            ...shopee.value.items.map((item) => ({
              id: String(item.itemId),
              title: item.title,
              price: item.price,
              imageUrl: item.imageUrl,
              marketplace: "Shopee" as const,
              offerType: "Oferta" as const,
            })),
          );
        }
        let flashTotal = 0;
        if (shopeeFlash.status === "fulfilled") {
          flashTotal = shopeeFlash.value.total;
          const existing = new Set(
            products.map((product) => `${product.marketplace}-${product.id}`),
          );
          products.push(
            ...shopeeFlash.value.items
              .filter((item) => !existing.has(`Shopee-${item.itemId}`))
              .map((item) => ({
                id: String(item.itemId),
                title: item.title,
                price: item.price,
                imageUrl: item.imageUrl,
                marketplace: "Shopee" as const,
                offerType: "Oferta Relâmpago" as const,
              })),
          );
        }
        setCatalogProducts(products);
        setCatalogTotals({
          mercadoLivre,
          shopee: shopeeTotal + flashTotal,
          shopeeFlash: flashTotal,
        });
        setCatalogLoaded(true);
        if (
          ml.status === "rejected" &&
          shopee.status === "rejected" &&
          shopeeFlash.status === "rejected"
        )
          setCatalogError(
            "Não foi possível carregar os catálogos. Verifique as integrações e tente novamente.",
          );
        else if (ml.status === "rejected" || shopee.status === "rejected")
          setCatalogError(
            "Uma das lojas não respondeu. Os produtos disponíveis da outra loja foram carregados.",
          );
      })
      .finally(() => setCatalogLoading(false));
  }, [view, step, catalogLoaded, catalogLoading]);

  const activeCount = saved.filter((a) => a.active).length;
  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(categorySearch.toLowerCase()),
  );
  const executions = Math.max(1, Math.floor((24 * 60) / draft.interval));
  const requiredPerDay =
    executions * draft.productsPerRun * Math.max(1, draft.groupIds.length);
  const sourceStock =
    (draft.sources.includes("Mercado Livre") ? catalogTotals.mercadoLivre : 0) +
    (draft.sources.includes("Shopee") ? catalogTotals.shopee : 0) +
    (draft.sources.includes("Listas de Produtos") ? offers.length : 0);
  const visibleCatalog = useMemo(
    () =>
      catalogProducts
        .filter((product) => draft.sources.includes(product.marketplace))
        .filter(
          (product) =>
            product.marketplace !== "Shopee" ||
            (draft.shopeeOfferTypes || ["Oferta", "Oferta Relâmpago"]).includes(
              product.offerType || "Oferta",
            ),
        )
        .slice(0, 8),
    [catalogProducts, draft.sources, draft.shopeeOfferTypes],
  );
  const cycleMinutes = Math.max(
    1,
    Math.ceil(
      (draft.productsPerRun * Math.max(1, draft.groupIds.length) * 20) / 60,
    ),
  );

  function startNew() {
    setDraft(blank());
    setStep(1);
    setFeedback("");
    setView("wizard");
  }
  function toggleDay(day: string) {
    setDraft((d) => ({
      ...d,
      days: d.days.includes(day)
        ? d.days.filter((x) => x !== day)
        : [...d.days, day],
    }));
  }
  function toggleGroup(id: string) {
    setDraft((d) => ({
      ...d,
      groupIds: d.groupIds.includes(id)
        ? d.groupIds.filter((x) => x !== id)
        : [...d.groupIds, id],
    }));
  }
  function toggleSource(source: string) {
    setDraft((d) => ({
      ...d,
      sources: d.sources.includes(source)
        ? d.sources.filter((x) => x !== source)
        : [...d.sources, source],
    }));
  }
  function toggleCategory(category: string) {
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(category)
        ? d.categories.filter((x) => x !== category)
        : [...d.categories, category],
    }));
  }
  function toggleShopeeOfferType(offerType: string) {
    setDraft((current) => {
      const selected = current.shopeeOfferTypes || [
        "Oferta",
        "Oferta Relâmpago",
      ];
      return {
        ...current,
        shopeeOfferTypes: selected.includes(offerType)
          ? selected.filter((item) => item !== offerType)
          : [...selected, offerType],
      };
    });
  }
  function next() {
    if (step === 1 && !draft.name.trim()) {
      setFeedback("Dê um nome para a automação antes de continuar.");
      return;
    }
    if (step === 3 && !draft.groupIds.length) {
      setFeedback("Selecione pelo menos um grupo do WhatsApp.");
      return;
    }
    setFeedback("");
    setStep(Math.min(6, step + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    if (step === 1) {
      setView("list");
      return;
    }
    setStep((step - 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function save() {
    const item = { ...draft, createdAt: new Date().toISOString() };
    setSaved((old) => [item, ...old.filter((a) => a.id !== item.id)]);
    setFeedback("Automação salva com sucesso.");
    setView("list");
  }
  function edit(item: Automation) {
    setDraft(item);
    setStep(1);
    setView("wizard");
  }
  function remove(id: string) {
    if (confirm("Excluir esta automação?"))
      setSaved((old) => old.filter((a) => a.id !== id));
  }

  if (view === "list" || view === "history")
    return (
      <div className="auto-page">
        <div className="auto-heading">
          <div>
            <span>AUTOMAÇÕES</span>
            <h1>{view === "history" ? "Histórico" : "Automações"}</h1>
            <p>
              {view === "history"
                ? "Acompanhe as automações criadas e alteradas."
                : `Gerencie seus envios automáticos no WhatsApp (${activeCount}/5)`}
            </p>
          </div>
          <div className="auto-actions">
            <button
              className="auto-btn ghost"
              onClick={() =>
                alert(
                  "Crie uma automação e avance pelas seis etapas. Cada etapa possui as instruções necessárias.",
                )
              }
            >
              <PlayCircle />
              Assistir Tutorial
            </button>
            <button
              className="auto-btn outline"
              onClick={() => setView(view === "history" ? "list" : "history")}
            >
              <History />
              {view === "history" ? "Voltar" : "Histórico"}
            </button>
            <button className="auto-btn primary" onClick={startNew}>
              <Plus />
              Nova Automação
            </button>
          </div>
        </div>
        {saved.length === 0 ? (
          <div className="auto-empty">
            <Zap />
            <h2>Nenhuma automação criada</h2>
            <p>
              Crie sua primeira automação para começar a enviar ofertas
              automaticamente.
            </p>
            <button className="auto-btn primary" onClick={startNew}>
              <Plus />
              Criar Automação
            </button>
          </div>
        ) : (
          <div className="auto-list">
            {saved.map((item) => (
              <article className="auto-card" key={item.id}>
                <div className="auto-card-icon">
                  <Zap />
                </div>
                <div className="auto-card-main">
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      {item.description || "Automação de ofertas do WhatsApp"}
                    </p>
                  </div>
                  <div className="auto-card-meta">
                    <span>
                      <CalendarDays />
                      {item.days.length} dias
                    </span>
                    <span>
                      <Clock3 />A cada {item.interval} min
                    </span>
                    <span>
                      <Users />
                      {item.groupIds.length} grupo(s)
                    </span>
                    <span>
                      <PackageSearch />
                      {item.productsPerRun} produtos/ciclo
                    </span>
                  </div>
                </div>
                <label className="auto-switch">
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={() =>
                      setSaved((old) =>
                        old.map((a) =>
                          a.id === item.id ? { ...a, active: !a.active } : a,
                        ),
                      )
                    }
                  />
                  <i />
                </label>
                <button className="auto-icon-btn" onClick={() => edit(item)}>
                  <Settings2 />
                </button>
                <button
                  className="auto-icon-btn danger"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    );

  return (
    <div className="auto-page auto-wizard">
      <div className="auto-heading">
        <div>
          <span>AUTOMAÇÕES</span>
          <h1>Nova Automação</h1>
          <p>Configure sua automação passo a passo</p>
        </div>
        <div className="auto-online">
          <i />
          ONLINE
        </div>
      </div>
      <div className="auto-steps">
        {steps.map(({ n, label, icon: Icon }) => (
          <button
            key={n}
            className={step === n ? "active" : step > n ? "done" : ""}
            onClick={() => setStep(n as Step)}
          >
            <span>{step > n ? <Check /> : n}</span>
            <Icon />
            {label}
          </button>
        ))}
      </div>
      {feedback && (
        <div className="auto-alert">
          <AlertTriangle />
          {feedback}
        </div>
      )}

      <section className="auto-wizard-card">
        {step === 1 && (
          <>
            <SectionHead
              icon={<Box />}
              title="Identidade da Automação"
              text="Dê um nome e descrição para identificar sua automação"
            />
            <Field label="Nome da Automação *">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ex: Ofertas Eletrônicos Manhã"
              />
            </Field>
            <Field label="Descrição (opcional)">
              <textarea
                rows={4}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="Descrição para uso interno, facilita a organização..."
              />
            </Field>
            <Info>
              Escolha um nome curto que permita identificar rapidamente o
              objetivo desta automação.
            </Info>
          </>
        )}

        {step === 2 && (
          <>
            <SectionHead
              icon={<CalendarDays />}
              title="Agenda / Tempo"
              text="Configure os dias, horários e intervalos de execução"
            />
            <h3>Dias da Semana</h3>
            <p className="auto-muted">
              Selecione os dias em que a automação deve rodar
            </p>
            <div className="auto-day-grid">
              {week.map((day) => (
                <label
                  className={draft.days.includes(day) ? "selected" : ""}
                  key={day}
                >
                  <input
                    type="checkbox"
                    checked={draft.days.includes(day)}
                    onChange={() => toggleDay(day)}
                  />
                  <span>{draft.days.includes(day) && <Check />}</span>
                  <b>{day}</b>
                  <small>
                    A automação funcionará no período definido abaixo.
                  </small>
                </label>
              ))}
            </div>
            <div className="auto-form-grid">
              <Field label="Executar a cada">
                <select
                  value={draft.interval}
                  onChange={(e) =>
                    setDraft({ ...draft, interval: Number(e.target.value) })
                  }
                >
                  {[15, 30, 60, 120, 180, 360, 720, 1440].map((v) => (
                    <option key={v} value={v}>
                      A cada{" "}
                      {v < 60
                        ? `${v} minutos`
                        : v === 60
                          ? "1 hora"
                          : `${v / 60} horas`}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Horário de início">
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(e) =>
                    setDraft({ ...draft, startTime: e.target.value })
                  }
                />
              </Field>
              <Field label="Horário de término">
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(e) =>
                    setDraft({ ...draft, endTime: e.target.value })
                  }
                />
              </Field>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <SectionHead
              icon={<Users />}
              title="Grupos e Canais (WhatsApp)"
              text="Selecione os números, grupos e canais para envio"
            />
            <h3>Grupos disponíveis</h3>
            {groupLoading ? (
              <div className="auto-loading">Sincronizando grupos...</div>
            ) : groups.length ? (
              <div className="auto-groups">
                <div className="auto-group-toolbar">
                  <b>{groups.length} grupos encontrados</b>
                  <button
                    onClick={() =>
                      setDraft({
                        ...draft,
                        groupIds:
                          draft.groupIds.length === groups.length
                            ? []
                            : groups.map((g) => g.id),
                      })
                    }
                  >
                    Marcar todos
                  </button>
                </div>
                {groups.map((group) => (
                  <label
                    className={
                      draft.groupIds.includes(group.id) ? "selected" : ""
                    }
                    key={group.id}
                  >
                    <input
                      type="checkbox"
                      checked={draft.groupIds.includes(group.id)}
                      onChange={() => toggleGroup(group.id)}
                    />
                    <span>
                      {draft.groupIds.includes(group.id) && <Check />}
                    </span>
                    <div>
                      <b>{group.name}</b>
                      <small>
                        {group.members || 0} membros •{" "}
                        {group.status || "Disponível"}
                      </small>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="auto-empty compact">
                <Users />
                <h2>Nenhum grupo sincronizado</h2>
                <p>Conecte o WhatsApp em Integrações e atualize os grupos.</p>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <SectionHead
              icon={<MessageCircle />}
              title="Conteúdo da Mensagem"
              text="Personalize o texto que acompanhará cada oferta"
            />
            <Field label="Modelo da mensagem">
              <textarea
                rows={9}
                value={draft.message}
                onChange={(e) =>
                  setDraft({ ...draft, message: e.target.value })
                }
              />
            </Field>
            <div className="auto-tags">
              <span>{"{produto}"}</span>
              <span>{"{preco}"}</span>
              <span>{"{preco_anterior}"}</span>
              <span>{"{desconto}"}</span>
              <span>{"{link}"}</span>
            </div>
            <Info>
              As variáveis serão substituídas automaticamente pelos dados reais
              de cada produto.
            </Info>
          </>
        )}

        {step === 5 && (
          <>
            <SectionHead
              icon={<ShoppingBag />}
              title="Fontes de Produtos"
              text="Escolha de onde virão as ofertas enviadas pela automação"
            />
            <Source
              name="Shopee"
              color="orange"
              detail={
                catalogLoading
                  ? "Carregando catálogo..."
                  : `${catalogTotals.shopee} produtos disponíveis`
              }
              active={draft.sources.includes("Shopee")}
              onChange={() => toggleSource("Shopee")}
            />
            {draft.sources.includes("Shopee") && (
              <div className="auto-source-config">
                <div className="auto-form-grid two">
                  <Field label="Produtos por execução">
                    <select
                      value={draft.productsPerRun}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          productsPerRun: Number(e.target.value),
                        })
                      }
                    >
                      {[1, 2, 3, 4, 5, 8, 10].map((v) => (
                        <option value={v} key={v}>
                          {v} produto{v > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ordenar por">
                    <select
                      value={draft.order}
                      onChange={(e) =>
                        setDraft({ ...draft, order: e.target.value })
                      }
                    >
                      <option>Mais vendidos</option>
                      <option>Maior comissão</option>
                      <option>Maior desconto</option>
                      <option>Mais recentes</option>
                    </select>
                  </Field>
                </div>
                <div className="auto-source-tabs">
                  <button
                    className={sourceTab === "types" ? "active" : ""}
                    onClick={() => setSourceTab("types")}
                  >
                    <Zap />
                    Tipos de Oferta ({(draft.shopeeOfferTypes || []).length})
                  </button>
                  <button
                    className={sourceTab === "categories" ? "active" : ""}
                    onClick={() => setSourceTab("categories")}
                  >
                    <Box />
                    Categorias ({draft.categories.length})
                  </button>
                  <button
                    className={sourceTab === "keywords" ? "active" : ""}
                    onClick={() => setSourceTab("keywords")}
                  >
                    <Search />
                    Palavras-Chave (0)
                  </button>
                </div>
                {sourceTab === "types" && (
                  <div className="auto-offer-types">
                    {[
                      {
                        name: "Oferta",
                        detail: `${Math.max(0, catalogTotals.shopee - catalogTotals.shopeeFlash)} produtos encontrados`,
                      },
                      {
                        name: "Oferta Relâmpago",
                        detail: `${catalogTotals.shopeeFlash} produtos por tempo limitado`,
                      },
                    ].map((type) => {
                      const checked = (
                        draft.shopeeOfferTypes || ["Oferta", "Oferta Relâmpago"]
                      ).includes(type.name);
                      return (
                        <label
                          className={checked ? "selected" : ""}
                          key={type.name}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleShopeeOfferType(type.name)}
                          />
                          <span>{checked && <Check />}</span>
                          <div>
                            <b>{type.name}</b>
                            <small>{type.detail}</small>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {sourceTab === "categories" && (
                  <>
                    <div className="auto-search">
                      <Search />
                      <input
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Buscar categoria..."
                      />
                    </div>
                    <div className="auto-category-list">
                      {filteredCategories.map((c) => (
                        <label key={c}>
                          <input
                            type="checkbox"
                            checked={draft.categories.includes(c)}
                            onChange={() => toggleCategory(c)}
                          />
                          <span>
                            {draft.categories.includes(c) && <Check />}
                          </span>
                          <div>
                            <b>{c}</b>
                            <small>Categoria disponível para seleção</small>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <Source
              name="Mercado Livre"
              color="yellow"
              detail={
                catalogLoading
                  ? "Carregando catálogo..."
                  : `${catalogTotals.mercadoLivre} produtos disponíveis`
              }
              active={draft.sources.includes("Mercado Livre")}
              onChange={() => toggleSource("Mercado Livre")}
            />
            <Source
              name="Listas de Produtos"
              color="blue"
              detail="Usar produtos salvos na Central de Ofertas"
              active={draft.sources.includes("Listas de Produtos")}
              onChange={() => toggleSource("Listas de Produtos")}
            />
            <div className="auto-product-preview">
              <div className="auto-product-preview-head">
                <div>
                  <h3>Produtos encontrados</h3>
                  <p>Prévia dos produtos que a automação poderá selecionar.</p>
                </div>
                <b>{sourceStock}</b>
              </div>
              {catalogLoading && (
                <div className="auto-loading">
                  Buscando produtos nas lojas...
                </div>
              )}
              {catalogError && (
                <div className="auto-catalog-error">{catalogError}</div>
              )}
              {!catalogLoading && visibleCatalog.length > 0 && (
                <div className="auto-product-grid">
                  {visibleCatalog.map((product) => (
                    <article key={`${product.marketplace}-${product.id}`}>
                      <img src={product.imageUrl} alt="" />
                      <div>
                        <span>{product.offerType || product.marketplace}</span>
                        <h4>{product.title}</h4>
                        <b>{money.format(product.price)}</b>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {!catalogLoading && !visibleCatalog.length && (
                <div className="auto-catalog-empty">
                  Ative Mercado Livre ou Shopee para visualizar os produtos.
                </div>
              )}
            </div>
            <div className="auto-negative">
              <h3>
                Não enviar produtos com estas palavras <span>Novo</span>
              </h3>
              <p>Uma palavra por linha — opcional</p>
              <textarea
                rows={5}
                value={draft.negativeWords}
                onChange={(e) =>
                  setDraft({ ...draft, negativeWords: e.target.value })
                }
                placeholder={"touca\ncapinha\nrefil"}
              />
            </div>
            <label className="auto-check-row">
              <input
                type="checkbox"
                checked={draft.shopeeVideos}
                onChange={(e) =>
                  setDraft({ ...draft, shopeeVideos: e.target.checked })
                }
              />
              <span>{draft.shopeeVideos && <Check />}</span>
              <div>
                <b>Incluir Shopee Vídeos</b>
                <small>Priorizar produtos que possuam conteúdo em vídeo</small>
              </div>
            </label>
          </>
        )}

        {step === 6 && (
          <>
            <SectionHead
              icon={<Settings2 />}
              title="Regras e Validação"
              text="Revise a capacidade e evite repetição de ofertas"
            />
            <Field label="Não repetir produto (horas)">
              <input
                type="number"
                min="1"
                max="720"
                value={draft.noRepeatHours}
                onChange={(e) =>
                  setDraft({ ...draft, noRepeatHours: Number(e.target.value) })
                }
              />
              <small>
                O mesmo produto não será enviado novamente ao mesmo grupo neste
                período.
              </small>
            </Field>
            <div className="auto-health good">
              <Check />
              <div>
                <b>
                  Cada ciclo leva ~{cycleMinutes} min — cabe no intervalo de{" "}
                  {draft.interval} min
                </b>
                <p>
                  {draft.productsPerRun} item(ns) para{" "}
                  {Math.max(1, draft.groupIds.length)} grupo(s) por ciclo.
                </p>
              </div>
            </div>
            <div
              className={`auto-health ${sourceStock >= requiredPerDay ? "good" : "bad"}`}
            >
              <PackageSearch />
              <div>
                <b>
                  {sourceStock >= requiredPerDay
                    ? "Sua automação tem produtos suficientes"
                    : "Sua automação pode ficar sem produtos"}
                </b>
                <p>
                  ~{executions} execuções/dia • {requiredPerDay} produtos
                  necessários por dia • {sourceStock} produtos salvos
                  disponíveis.
                </p>
              </div>
            </div>
            <div className="auto-summary">
              <h3>Resumo da automação</h3>
              <div>
                <span>
                  Nome<b>{draft.name}</b>
                </span>
                <span>
                  Agenda<b>A cada {draft.interval} min</b>
                </span>
                <span>
                  Grupos<b>{draft.groupIds.length}</b>
                </span>
                <span>
                  Fontes<b>{draft.sources.length}</b>
                </span>
                <span>
                  Produtos/ciclo<b>{draft.productsPerRun}</b>
                </span>
              </div>
            </div>
          </>
        )}
      </section>
      <div className="auto-nav">
        <button className="auto-btn outline" onClick={back}>
          <ArrowLeft />
          Voltar
        </button>
        {step < 6 ? (
          <button className="auto-btn primary" onClick={next}>
            Próximo
            <ArrowRight />
          </button>
        ) : (
          <button className="auto-btn primary" onClick={save}>
            <Save />
            Salvar Automação
          </button>
        )}
      </div>
    </div>
  );
}

function SectionHead({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="auto-section-head">
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="auto-field">
      <b>{label}</b>
      {children}
    </label>
  );
}
function Info({ children }: { children: React.ReactNode }) {
  return (
    <div className="auto-info">
      <Sparkles />
      {children}
    </div>
  );
}
function Source({
  name,
  detail,
  color,
  active,
  onChange,
}: {
  name: string;
  detail: string;
  color: string;
  active: boolean;
  onChange: () => void;
}) {
  return (
    <div className={`auto-source ${color}`}>
      <div className="auto-source-logo">
        {name === "Shopee" ? "S" : name === "Mercado Livre" ? "M" : "L"}
      </div>
      <div>
        <b>{name}</b>
        <small>{detail}</small>
      </div>
      <label className="auto-switch">
        <input type="checkbox" checked={active} onChange={onChange} />
        <i />
      </label>
    </div>
  );
}
