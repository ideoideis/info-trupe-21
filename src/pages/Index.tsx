import { useMemo, useState } from "react";
import { Plus, Trash2, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase, TRUPE_PHOTO_BUCKET, TRUPE_CI_BUCKET } from "@/lib/supabase";
import { LegalDialog } from "@/components/LegalDialog";
import termeniMd from "@/content/termeni.md?raw";
import confidentialitateMd from "@/content/confidentialitate.md?raw";
import etichetaLogo from "@/assets/eticheta-ideoideis.png";

// Festival lineup — each troupe maps to its (already known) show. Selecting a
// troupe auto-fills "nume spectacol". The troupe from Alexandria has no preset
// show, so for it the show field is optional.
const TRUPA_OPTIONS: { trupa: string; spectacol: string }[] = [
  { trupa: "Brainstorming București", spectacol: "Acesta este un test" },
  { trupa: "Artwork Iași", spectacol: "Praf de rege" },
  { trupa: "Atelierul de teatru, Botoșani", spectacol: "Lecția de tăcere" },
  { trupa: "A.C.T Bacău", spectacol: "Clovnii din Chaillot" },
  { trupa: "Amprente, Brașov", spectacol: "Ajunge" },
  { trupa: "Trupa Leira, Râmnicu Vâlcea", spectacol: "Leonardo! 500 de ani e prea mult" },
  { trupa: "Protha, Panciu", spectacol: "We are stories" },
  { trupa: "Trupa din Alexandria", spectacol: "" },
].sort((a, b) => a.trupa.localeCompare(b.trupa, "ro", { sensitivity: "base" }));

const TRICOU_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

type Participant = {
  nume: string;
  prenume: string;
  functie: string;
  varsta: string;
  telefon: string;
  tricou: string;
  restrictii: string;
  buletin: File | null;
};

const emptyParticipant = (): Participant => ({
  nume: "",
  prenume: "",
  functie: "",
  varsta: "",
  telefon: "",
  tricou: "",
  restrictii: "",
  buletin: null,
});

const MAX_PARTICIPANTI = 15;

// Supabase storage keys can't contain diacritics, commas or slashes, and the
// troupe / participant names have all of those (e.g. "Atelierul de teatru,
// Botoșani"). Strip accents and any unsafe character, keeping the text readable
// (spaces and casing preserved) so the folder/file names stay human-friendly.
const safeName = (s: string) =>
  s
    .normalize("NFD")                   // separate base letters from accents
    .replace(/\p{Diacritic}/gu, "")     // drop the accents (ș→s, â→a, …)
    .replace(/[^a-zA-Z0-9 _-]+/g, "")   // drop anything else unsafe (commas, /, …)
    .replace(/\s+/g, " ")
    .trim();

export default function Index() {
  // submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Becomes true after the first blocked submit, then required-field errors
  // are shown live (and clear as the user fills each one in).
  const [showErrors, setShowErrors] = useState(false);

  // despre spectacol
  const [trupa, setTrupa] = useState("");
  const [numeSpectacol, setNumeSpectacol] = useState("");
  const [dramaturg, setDramaturg] = useState("");
  const [echipaCreativa, setEchipaCreativa] = useState("");
  const [distributie, setDistributie] = useState("");
  const [despreSpectacol, setDespreSpectacol] = useState("");
  const [necesarTehnic, setNecesarTehnic] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // The show is optional only for troupes with no preset show (Alexandria).
  const spectacolOptional =
    TRUPA_OPTIONS.find((o) => o.trupa === trupa)?.spectacol === "";

  // Picking a troupe auto-fills its known show (still editable below).
  const handleTrupaChange = (value: string) => {
    setTrupa(value);
    setNumeSpectacol(TRUPA_OPTIONS.find((o) => o.trupa === value)?.spectacol ?? "");
  };

  // despre participanți
  const [participanti, setParticipanti] = useState<Participant[]>([emptyParticipant()]);

  const addParticipant = () =>
    setParticipanti((curr) =>
      curr.length >= MAX_PARTICIPANTI ? curr : [...curr, emptyParticipant()]
    );

  const removeParticipant = (idx: number) =>
    setParticipanti((curr) => curr.filter((_, i) => i !== idx));

  const updateParticipant = <K extends keyof Participant>(
    idx: number,
    field: K,
    value: Participant[K]
  ) => {
    setParticipanti((curr) =>
      curr.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  };

  // despre coordonator
  const [coordNume, setCoordNume] = useState("");
  const [coordVarsta, setCoordVarsta] = useState("");
  const [coordTricou, setCoordTricou] = useState("");
  const [coordEmail, setCoordEmail] = useState("");
  const [coordTelefon, setCoordTelefon] = useState("");

  // pentru contract
  const [persoanaTip, setPersoanaTip] = useState("");

  // pentru contract — persoană fizică
  const [pfNumeComplet, setPfNumeComplet] = useState("");
  const [pfAdresa, setPfAdresa] = useState("");
  const [pfCnp, setPfCnp] = useState("");
  const [pfCopieCI, setPfCopieCI] = useState<File | null>(null);
  const [pfTelefon, setPfTelefon] = useState("");
  const [pfEmail, setPfEmail] = useState("");
  const [pfContBancar, setPfContBancar] = useState("");
  const [pfBanca, setPfBanca] = useState("");

  // pentru contract — persoană juridică
  const [pjNume, setPjNume] = useState("");
  const [pjSediu, setPjSediu] = useState("");
  const [pjCui, setPjCui] = useState("");
  const [pjRegCom, setPjRegCom] = useState("");
  const [pjContBancar, setPjContBancar] = useState("");
  const [pjBanca, setPjBanca] = useState("");
  const [pjReprezentant, setPjReprezentant] = useState("");

  const [acord, setAcord] = useState(false);

  // ── Required-field validation ──────────────────────────────────────────
  // Native HTML `required` silently refuses to submit when an empty required
  // control isn't focusable (the Radix Selects + hidden file inputs) — the
  // browser only logs to the console, so the person filling the form sees
  // nothing happen. We validate in JS instead (the <form> has noValidate) and
  // surface every missing field. `errors` is derived, so once `showErrors` is
  // on, a field's highlight clears the moment it's filled in.
  const REQUIRED = "Câmp obligatoriu";
  const errors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    const has = (s: string) => s.trim().length > 0;

    // despre spectacol
    if (!has(trupa)) e.trupa = REQUIRED;
    if (!spectacolOptional && !has(numeSpectacol)) e.numeSpectacol = REQUIRED;
    if (!has(dramaturg)) e.dramaturg = REQUIRED;
    if (!has(echipaCreativa)) e.echipaCreativa = REQUIRED;
    if (!has(distributie)) e.distributie = REQUIRED;
    if (!has(despreSpectacol)) e.despreSpectacol = REQUIRED;
    if (!has(necesarTehnic)) e.necesarTehnic = REQUIRED;
    if (!photoFile) e.photoFile = "Atașează o fotografie";

    // despre participanți
    participanti.forEach((p, i) => {
      if (!has(p.nume)) e[`participant-${i}-nume`] = REQUIRED;
      if (!has(p.prenume)) e[`participant-${i}-prenume`] = REQUIRED;
      if (!has(p.functie)) e[`participant-${i}-functie`] = REQUIRED;
      if (!has(p.varsta)) e[`participant-${i}-varsta`] = REQUIRED;
      if (!has(p.telefon)) e[`participant-${i}-telefon`] = REQUIRED;
      if (!has(p.tricou)) e[`participant-${i}-tricou`] = REQUIRED;
      if (!has(p.restrictii)) e[`participant-${i}-restrictii`] = REQUIRED;
      if (!p.buletin) e[`participant-${i}-buletin`] = "Atașează poza buletinului";
    });

    // despre coordonator
    if (!has(coordNume)) e.coordNume = REQUIRED;
    if (!has(coordVarsta)) e.coordVarsta = REQUIRED;
    if (!has(coordTricou)) e.coordTricou = REQUIRED;
    if (!has(coordEmail)) e.coordEmail = REQUIRED;
    if (!has(coordTelefon)) e.coordTelefon = REQUIRED;

    // pentru contract
    if (!has(persoanaTip)) e.persoanaTip = REQUIRED;
    if (persoanaTip === "fizica") {
      if (!has(pfNumeComplet)) e.pfNumeComplet = REQUIRED;
      if (!has(pfAdresa)) e.pfAdresa = REQUIRED;
      if (!has(pfCnp)) e.pfCnp = REQUIRED;
      if (!pfCopieCI) e.pfCopieCI = "Atașează copia CI";
      if (!has(pfTelefon)) e.pfTelefon = REQUIRED;
      if (!has(pfEmail)) e.pfEmail = REQUIRED;
      if (!has(pfContBancar)) e.pfContBancar = REQUIRED;
      if (!has(pfBanca)) e.pfBanca = REQUIRED;
    } else if (persoanaTip === "juridica") {
      if (!has(pjNume)) e.pjNume = REQUIRED;
      if (!has(pjSediu)) e.pjSediu = REQUIRED;
      if (!has(pjCui)) e.pjCui = REQUIRED;
      if (!has(pjRegCom)) e.pjRegCom = REQUIRED;
      if (!has(pjContBancar)) e.pjContBancar = REQUIRED;
      if (!has(pjBanca)) e.pjBanca = REQUIRED;
      if (!has(pjReprezentant)) e.pjReprezentant = REQUIRED;
    }

    if (!acord) e.acord = "Trebuie să accepți termenii și condițiile.";

    return e;
  }, [
    trupa, spectacolOptional, numeSpectacol, dramaturg, echipaCreativa,
    distributie, despreSpectacol, necesarTehnic, photoFile, participanti,
    coordNume, coordVarsta, coordTricou, coordEmail, coordTelefon, persoanaTip,
    pfNumeComplet, pfAdresa, pfCnp, pfCopieCI, pfTelefon, pfEmail, pfContBancar,
    pfBanca, pjNume, pjSediu, pjCui, pjRegCom, pjContBancar, pjBanca,
    pjReprezentant, acord,
  ]);

  // Error message to show for a given field, only once a submit was blocked.
  const fieldError = (id: string) => (showErrors ? errors[id] : undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Block submit and point the user at every missing required field.
    const missingIds = Object.keys(errors);
    if (missingIds.length > 0) {
      setShowErrors(true);
      // Scroll to (and focus) the first missing field. Object keys preserve
      // insertion order, which matches DOM order, so [0] is the topmost one.
      const firstId = missingIds[0];
      requestAnimationFrame(() => {
        const el = document.getElementById(`field-${firstId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          "input:not([type=file]), textarea"
        )?.focus({ preventScroll: true });
      });
      toast.error(
        missingIds.length === 1
          ? "A mai rămas un câmp obligatoriu de completat."
          : `Au mai rămas ${missingIds.length} câmpuri obligatorii de completat.`,
        { description: "Câmpurile lipsă sunt evidențiate cu roșu mai jos." }
      );
      return;
    }

    if (!supabase) {
      toast.error("Supabase neconfigurat. Lipsesc cheile din .env.");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Upload photo to storage if present
      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const key = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(TRUPE_PHOTO_BUCKET)
          .upload(key, photoFile, { contentType: photoFile.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(TRUPE_PHOTO_BUCKET).getPublicUrl(key);
        photo_url = pub.publicUrl;
      }

      // 1b. Upload "copie CI" when persoană fizică — PRIVATE bucket.
      // We store only the storage path; the file is read later via a signed URL.
      let copie_ci_path: string | null = null;
      if (persoanaTip === "fizica" && pfCopieCI) {
        const ext = pfCopieCI.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const key = `${crypto.randomUUID()}.${ext}`;
        const { error: ciErr } = await supabase.storage
          .from(TRUPE_CI_BUCKET)
          .upload(key, pfCopieCI, { contentType: pfCopieCI.type, upsert: false });
        if (ciErr) throw ciErr;
        copie_ci_path = key;
      }

      // conditional contract block — shape depends on persoană fizică / juridică
      const contract_details =
        persoanaTip === "fizica"
          ? {
              nume_complet: pfNumeComplet,
              adresa: pfAdresa,
              cnp: pfCnp,
              copie_ci_path,
              telefon: pfTelefon,
              email: pfEmail,
              cont_bancar: pfContBancar,
              banca: pfBanca,
            }
          : persoanaTip === "juridica"
          ? {
              nume_persoana_juridica: pjNume,
              sediu_social: pjSediu,
              cui: pjCui,
              nr_registrul_comertului: pjRegCom,
              cont_bancar: pjContBancar,
              banca: pjBanca,
              reprezentant: pjReprezentant,
            }
          : {};

      // 1c. Upload each participant's ID photo (buletin) to the PRIVATE bucket,
      // organised as "<trupă>/<nume participant>.<ext>" so the festival team
      // gets one folder per group with each photo named after the person.
      //
      // The bucket is INSERT-only for the public form (no overwrite permission —
      // these are sensitive ID scans), so we never use upsert. If a name is
      // already taken — another participant in this batch, or the same group
      // re-submitting — we fall back to "name (2)", "name (3)", … rather than
      // overwriting an existing scan or failing the whole submission.
      const trupaFolder = safeName(trupa) || "trupa";
      const usedNames = new Set<string>();

      const uploadBuletin = async (file: File, base: string): Promise<string> => {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        for (let n = 1; n < 50; n++) {
          const name = n === 1 ? `${base}.${ext}` : `${base} (${n}).${ext}`;
          if (usedNames.has(name)) continue; // taken earlier in this batch
          usedNames.add(name);
          const key = `${trupaFolder}/${name}`;
          const { error } = await supabase.storage
            .from(TRUPE_CI_BUCKET)
            .upload(key, file, { contentType: file.type, upsert: false });
          if (!error) return key;
          // 409 / "already exists" → name taken in storage, try the next suffix.
          const status = String((error as { statusCode?: string }).statusCode ?? "");
          if (status !== "409" && !/exist/i.test(error.message)) throw error;
        }
        throw new Error("Nu am putut încărca poza buletinului. Încearcă din nou.");
      };

      const participantiData = await Promise.all(
        participanti.map(async ({ buletin, ...rest }, idx) => {
          let buletin_path: string | null = null;
          if (buletin) {
            const base =
              safeName(`${rest.prenume} ${rest.nume}`) || `participant ${idx + 1}`;
            buletin_path = await uploadBuletin(buletin, base);
          }
          return { ...rest, buletin_path };
        })
      );

      // 2. Insert the row
      const { error } = await supabase.from("trupe_submissions").insert({
        trupa,
        nume_spectacol: numeSpectacol,
        dramaturg,
        echipa_creativa: echipaCreativa,
        distributie,
        despre_spectacol: despreSpectacol,
        necesar_tehnic: necesarTehnic,
        photo_url,
        nr_participanti: participanti.length,
        participanti: participantiData,
        coordonator_nume: coordNume,
        coordonator_varsta: coordVarsta,
        coordonator_tricou: coordTricou,
        coordonator_email: coordEmail,
        coordonator_telefon: coordTelefon,
        persoana_tip: persoanaTip,
        contract_details,
        acord_termeni: acord,
      });
      if (error) throw error;

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Mulțumim! Formularul a fost trimis.");
    } catch (err) {
      console.error("[trupe_submissions] submit failed", err);
      toast.error("A apărut o eroare la trimitere.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-primary text-primary-foreground flex items-center justify-center px-6 py-24">
        <div className="text-center max-w-xl">
          <span className="micro-label">Info Trupe</span>
          <h1 className="mt-3 text-5xl md:text-6xl font-bold tracking-tight">
            Mulțumim!
          </h1>
          <span className="red-line mx-auto mt-6 w-24 bg-white" style={{ background: "white" }} />
          <p className="mt-8 text-base md:text-lg leading-relaxed opacity-95">
            Formularul a fost trimis cu succes. Te vom contacta în curând cu
            detaliile despre festival.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-6 md:px-10 pb-16 md:pb-24">
        {/* Eticheta — logo Festivalul ideo ideis, glued to the very top */}
        <div className="mb-12 inline-block bg-white p-3 md:p-4">
          <img
            src={etichetaLogo}
            alt="Festivalul ideo ideis"
            className="h-20 w-auto md:h-24"
          />
        </div>

        {/* Hero / intro */}
        <header>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95]">
            trupe #21:
            <br />
            informații
          </h1>
          <div className="mt-10 space-y-4 max-w-2xl text-base md:text-lg leading-relaxed">
            <p>
              Pentru că timpul trece repede și ne apropiem ușor, ușor de
              festival, vă rugăm să completați un formular cu câteva date
              personale ale participanților și date despre trupă și spectacol.
            </p>
            <p>
              Întrucât aceste informații ne sunt foarte importante și vor fi
              folosite pentru buna desfășurare a Festivalului, avem nevoie să
              verificați extrem de bine ca toate lucrurile completate să fie
              corecte, complete și să folosiți diacritice acolo unde este cazul.
            </p>
            <p>Mulțumim!</p>
          </div>
        </header>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-12 bg-background text-foreground p-8 md:p-14 space-y-16"
        >
          {/* ───────── despre spectacol ───────── */}
          <section className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-primary lowercase">
              despre spectacol
            </h2>

            <Field id="trupa" label="trupa" required error={fieldError("trupa")}>
              <Select value={trupa} onValueChange={handleTrupaChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="…" />
                </SelectTrigger>
                <SelectContent>
                  {TRUPA_OPTIONS.map((o) => (
                    <SelectItem key={o.trupa} value={o.trupa}>
                      {o.trupa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              id="numeSpectacol"
              label="nume spectacol"
              required={!spectacolOptional}
              helper={spectacolOptional ? "opțional pentru această trupă" : undefined}
              error={fieldError("numeSpectacol")}
            >
              <Input
                value={numeSpectacol}
                onChange={(e) => setNumeSpectacol(e.target.value)}
                placeholder="…"
                required={!spectacolOptional}
              />
            </Field>

            <Field id="dramaturg" label="dramaturg" required error={fieldError("dramaturg")}>
              <Input
                value={dramaturg}
                onChange={(e) => setDramaturg(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field
              id="echipaCreativa"
              label="regizor, scenograf, coregraf, coloana sonoră etc."
              required
              helper="Prenume Nume - funcție"
              error={fieldError("echipaCreativa")}
            >
              <Input
                value={echipaCreativa}
                onChange={(e) => setEchipaCreativa(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field id="distributie" label="distribuție" required helper="Prenume Nume - funcție" error={fieldError("distributie")}>
              <Input
                value={distributie}
                onChange={(e) => setDistributie(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field
              id="despreSpectacol"
              label="despre spectacol"
              required
              helper="descriere spectacol / povestea completă / scurt rezumat al piesei, nu viziunea regizorală (500-750 caractere cu spații)"
              error={fieldError("despreSpectacol")}
            >
              <Textarea
                value={despreSpectacol}
                onChange={(e) => setDespreSpectacol(e.target.value)}
                placeholder="…"
                rows={6}
                required
              />
            </Field>

            <Field id="necesarTehnic" label="necesar tehnic" required error={fieldError("necesarTehnic")}>
              <Textarea
                value={necesarTehnic}
                onChange={(e) => setNecesarTehnic(e.target.value)}
                placeholder="…"
                rows={4}
                required
              />
            </Field>

            <Field
              id="photoFile"
              label="fotografie din spectacol sau de la repetiții"
              required
              helper="300 dpi, rezoluție minimă 1024×768 px, format: jpg, jpeg, png, tif, tiff"
              error={fieldError("photoFile")}
            >
              <label
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 cursor-pointer",
                  "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
                  "text-sm font-medium"
                )}
              >
                <Plus className="size-4" />
                {photoFile ? photoFile.name : "alege un fișier"}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.tif,.tiff,image/jpeg,image/png,image/tiff"
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  required={!photoFile}
                />
              </label>
            </Field>
          </section>

          {/* ───────── despre participanți ───────── */}
          <section className="space-y-8">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-3xl md:text-4xl font-bold text-primary lowercase">
                despre participanți
              </h2>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {participanti.length} / {MAX_PARTICIPANTI}
              </span>
            </div>

            <div className="space-y-6">
              {participanti.map((p, i) => (
                <div key={i} className="border border-border p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium lowercase text-primary">
                      participant {i + 1}
                    </span>
                    {participanti.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(i)}
                        className="inline-flex items-center gap-1 text-xs lowercase text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                        elimină
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field id={`participant-${i}-nume`} label="nume" required error={fieldError(`participant-${i}-nume`)}>
                      <Input
                        value={p.nume}
                        onChange={(e) => updateParticipant(i, "nume", e.target.value)}
                        placeholder="…"
                        required
                      />
                    </Field>
                    <Field id={`participant-${i}-prenume`} label="prenume" required error={fieldError(`participant-${i}-prenume`)}>
                      <Input
                        value={p.prenume}
                        onChange={(e) => updateParticipant(i, "prenume", e.target.value)}
                        placeholder="…"
                        required
                      />
                    </Field>
                  </div>

                  <Field id={`participant-${i}-functie`} label="funcție" required error={fieldError(`participant-${i}-functie`)}>
                    <Input
                      value={p.functie}
                      onChange={(e) => updateParticipant(i, "functie", e.target.value)}
                      placeholder="…"
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field id={`participant-${i}-varsta`} label="vârstă" required error={fieldError(`participant-${i}-varsta`)}>
                      <Input
                        type="number"
                        min={1}
                        value={p.varsta}
                        onChange={(e) => updateParticipant(i, "varsta", e.target.value)}
                        placeholder="…"
                        required
                      />
                    </Field>
                    <Field id={`participant-${i}-telefon`} label="nr. telefon" required error={fieldError(`participant-${i}-telefon`)}>
                      <Input
                        type="tel"
                        value={p.telefon}
                        onChange={(e) => updateParticipant(i, "telefon", e.target.value)}
                        placeholder="…"
                        required
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field id={`participant-${i}-tricou`} label="mărime tricou" required error={fieldError(`participant-${i}-tricou`)}>
                      <Select
                        value={p.tricou}
                        onValueChange={(v) => updateParticipant(i, "tricou", v)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="…" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRICOU_SIZES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field
                      id={`participant-${i}-restrictii`}
                      label="restricții alimentare"
                      required
                      helper="ex: fără / vegetarian / alergii"
                      error={fieldError(`participant-${i}-restrictii`)}
                    >
                      <Input
                        value={p.restrictii}
                        onChange={(e) => updateParticipant(i, "restrictii", e.target.value)}
                        placeholder="…"
                        required
                      />
                    </Field>
                  </div>

                  <Field
                    id={`participant-${i}-buletin`}
                    label="poză buletin"
                    required
                    helper="format: jpg, jpeg, png, pdf — stocat privat"
                    error={fieldError(`participant-${i}-buletin`)}
                  >
                    <label
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 cursor-pointer",
                        "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
                        "text-sm font-medium"
                      )}
                    >
                      <Plus className="size-4" />
                      {p.buletin ? p.buletin.name : "alege un fișier"}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        className="hidden"
                        onChange={(e) =>
                          updateParticipant(i, "buletin", e.target.files?.[0] ?? null)
                        }
                        required={!p.buletin}
                      />
                    </label>
                  </Field>
                </div>
              ))}
            </div>

            {participanti.length < MAX_PARTICIPANTI && (
              <button
                type="button"
                onClick={addParticipant}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2",
                  "border border-primary text-primary hover:bg-primary hover:text-primary-foreground",
                  "transition-colors text-sm font-medium lowercase"
                )}
              >
                <Plus className="size-4" />
                adaugă participant
              </button>
            )}
          </section>

          {/* ───────── despre coordonator ───────── */}
          <section className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-primary lowercase">
              despre coordonator
            </h2>

            <Field id="coordNume" label="coordonator trupă" required helper="Prenume Nume" error={fieldError("coordNume")}>
              <Input
                value={coordNume}
                onChange={(e) => setCoordNume(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field id="coordVarsta" label="vârstă coordonator" required error={fieldError("coordVarsta")}>
              <Input
                value={coordVarsta}
                onChange={(e) => setCoordVarsta(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field id="coordTricou" label="tricou coordonator" required error={fieldError("coordTricou")}>
              <Select value={coordTricou} onValueChange={setCoordTricou} required>
                <SelectTrigger>
                  <SelectValue placeholder="…" />
                </SelectTrigger>
                <SelectContent>
                  {TRICOU_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="coordEmail" label="e-mail coordonator" required error={fieldError("coordEmail")}>
              <Input
                type="email"
                value={coordEmail}
                onChange={(e) => setCoordEmail(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field id="coordTelefon" label="nr. telefon coordonator" required error={fieldError("coordTelefon")}>
              <Input
                type="tel"
                value={coordTelefon}
                onChange={(e) => setCoordTelefon(e.target.value)}
                placeholder="…"
                required
              />
            </Field>
          </section>

          {/* ───────── pentru contract ───────── */}
          <section className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-primary lowercase">
              pentru contract
            </h2>

            <div className="space-y-4 text-sm md:text-base leading-relaxed">
              <p>
                Taxa de participare este în valoare de <strong>800 lei/persoană</strong>,
                indiferent de numărul de membri ai trupei. Aceasta se va achita
                printr-o singură tranzacție per trupă.
              </p>
              <p>
                În următoarea secțiune, vă rugăm să completați informațiile cu
                privire la persoana fizică/juridică în numele căreia se va
                achita taxa de înscriere. Vă rugăm să țineți cont că factura se
                va emite cu detaliile completate în acest formular și trebuie să
                corespundă cu modalitatea în care veți achita suma. Efectuarea
                plății se va face ulterior, pe baza facturii furnizate de noi.
              </p>
            </div>

            <Field id="persoanaTip" label="persoană fizică / juridică?" required error={fieldError("persoanaTip")}>
              <Select value={persoanaTip} onValueChange={setPersoanaTip} required>
                <SelectTrigger>
                  <SelectValue placeholder="…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fizica">persoană fizică</SelectItem>
                  <SelectItem value="juridica">persoană juridică</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/* ── conditional: persoană fizică ── */}
            {persoanaTip === "fizica" && (
              <div className="space-y-8 border-l-2 border-primary pl-6">
                <Field id="pfNumeComplet" label="nume complet" required error={fieldError("pfNumeComplet")}>
                  <Input
                    value={pfNumeComplet}
                    onChange={(e) => setPfNumeComplet(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pfAdresa" label="adresă" required error={fieldError("pfAdresa")}>
                  <Input
                    value={pfAdresa}
                    onChange={(e) => setPfAdresa(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pfCnp" label="CNP" required error={fieldError("pfCnp")}>
                  <Input
                    value={pfCnp}
                    onChange={(e) => setPfCnp(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pfCopieCI" label="copie CI" required helper="format: jpg, jpeg, png, pdf" error={fieldError("pfCopieCI")}>
                  <label
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 cursor-pointer",
                      "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
                      "text-sm font-medium"
                    )}
                  >
                    <Plus className="size-4" />
                    {pfCopieCI ? pfCopieCI.name : "alege un fișier"}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      className="hidden"
                      onChange={(e) => setPfCopieCI(e.target.files?.[0] ?? null)}
                      required={!pfCopieCI}
                    />
                  </label>
                </Field>

                <Field id="pfTelefon" label="nr. telefon" required error={fieldError("pfTelefon")}>
                  <Input
                    type="tel"
                    value={pfTelefon}
                    onChange={(e) => setPfTelefon(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pfEmail" label="e-mail" required error={fieldError("pfEmail")}>
                  <Input
                    type="email"
                    value={pfEmail}
                    onChange={(e) => setPfEmail(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pfContBancar" label="cont bancar" required error={fieldError("pfContBancar")}>
                  <Input
                    value={pfContBancar}
                    onChange={(e) => setPfContBancar(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pfBanca" label="banca" required error={fieldError("pfBanca")}>
                  <Input
                    value={pfBanca}
                    onChange={(e) => setPfBanca(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>
              </div>
            )}

            {/* ── conditional: persoană juridică ── */}
            {persoanaTip === "juridica" && (
              <div className="space-y-8 border-l-2 border-primary pl-6">
                <Field id="pjNume" label="nume persoană juridică" required error={fieldError("pjNume")}>
                  <Input
                    value={pjNume}
                    onChange={(e) => setPjNume(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pjSediu" label="sediu social" required error={fieldError("pjSediu")}>
                  <Input
                    value={pjSediu}
                    onChange={(e) => setPjSediu(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pjCui" label="CUI (codul unic de înregistrare) societate juridică" required error={fieldError("pjCui")}>
                  <Input
                    value={pjCui}
                    onChange={(e) => setPjCui(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pjRegCom" label="numărul de ordine din Registrul Comerțului" required error={fieldError("pjRegCom")}>
                  <Input
                    value={pjRegCom}
                    onChange={(e) => setPjRegCom(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pjContBancar" label="cont bancar" required error={fieldError("pjContBancar")}>
                  <Input
                    value={pjContBancar}
                    onChange={(e) => setPjContBancar(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field id="pjBanca" label="banca" required error={fieldError("pjBanca")}>
                  <Input
                    value={pjBanca}
                    onChange={(e) => setPjBanca(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field
                  id="pjReprezentant"
                  label="numele și funcția reprezentantului"
                  required
                  helper="Prenume Nume - funcție"
                  error={fieldError("pjReprezentant")}
                >
                  <Input
                    value={pjReprezentant}
                    onChange={(e) => setPjReprezentant(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>
              </div>
            )}

            <a
              href="https://ideoideis.ro/proiectele/festivalul/regulament-participare-trupe/"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2",
                "border border-primary text-primary hover:bg-primary hover:text-primary-foreground",
                "transition-colors text-sm font-medium lowercase"
              )}
            >
              <ExternalLink className="size-4" />
              citește regulamentul festivalului
            </a>

            <div id="field-acord" className="scroll-mt-24 pt-2">
              <div
                className={cn(
                  "flex items-start gap-3",
                  fieldError("acord") &&
                    "rounded-md ring-2 ring-destructive ring-offset-2 ring-offset-background"
                )}
              >
                <Checkbox
                  id="acord"
                  checked={acord}
                  onCheckedChange={(v) => setAcord(v === true)}
                />
                <Label htmlFor="acord" className="text-sm font-normal leading-relaxed cursor-pointer">
                Sunt de acord cu{" "}
                <LegalDialog
                  title="Termeni și condiții"
                  content={termeniMd}
                  trigger={
                    <button type="button" className="text-primary underline">
                      Termeni și condiții
                    </button>
                  }
                />
                ,{" "}
                <LegalDialog
                  title="Politica de confidențialitate"
                  content={confidentialitateMd}
                  trigger={
                    <button type="button" className="text-primary underline">
                      Politica de confidențialitate
                    </button>
                  }
                />{" "}
                și{" "}
                <a
                  href="https://ideoideis.ro/proiectele/festivalul/regulament-participare-trupe/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  regulamentul de participare
                </a>
                . *
              </Label>
              </div>
              {fieldError("acord") && (
                <p className="mt-2 text-xs font-medium text-destructive">
                  {fieldError("acord")}
                </p>
              )}
            </div>

            {showErrors && Object.keys(errors).length > 0 && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-md border border-destructive bg-destructive/10 p-4 text-sm font-medium text-destructive"
              >
                <AlertCircle className="size-5 shrink-0" />
                <p>
                  {Object.keys(errors).length === 1
                    ? "A mai rămas un câmp obligatoriu de completat — este evidențiat cu roșu mai sus."
                    : `Au mai rămas ${Object.keys(errors).length} câmpuri obligatorii de completat — sunt evidențiate cu roșu mai sus.`}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 text-base font-medium lowercase"
            >
              {submitting ? "se trimite…" : "trimite"}
            </Button>
          </section>
        </form>
      </div>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────── */

function Field({
  id,
  label,
  required,
  helper,
  error,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id ? `field-${id}` : undefined} className="scroll-mt-24">
      <Label
        className={cn(
          "text-sm font-normal lowercase",
          error && "text-destructive font-medium"
        )}
      >
        {label} {required && "*"}
      </Label>
      <div
        className={cn(
          "mt-2",
          error &&
            "rounded-md ring-2 ring-destructive ring-offset-2 ring-offset-background"
        )}
      >
        {children}
      </div>
      {error ? (
        <p className="mt-2 text-xs font-medium text-destructive">{error}</p>
      ) : helper ? (
        <p className="mt-2 text-xs italic text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
