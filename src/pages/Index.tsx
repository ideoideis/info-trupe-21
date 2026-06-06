import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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

export default function Index() {
  // submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acord) {
      toast.error("Te rugăm să accepți termenii și condițiile.");
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
      // then store the structured record with only the storage path.
      const participantiData = await Promise.all(
        participanti.map(async ({ buletin, ...rest }) => {
          let buletin_path: string | null = null;
          if (buletin) {
            const ext = buletin.name.split(".").pop()?.toLowerCase() ?? "jpg";
            const key = `${crypto.randomUUID()}.${ext}`;
            const { error: bErr } = await supabase.storage
              .from(TRUPE_CI_BUCKET)
              .upload(key, buletin, { contentType: buletin.type, upsert: false });
            if (bErr) throw bErr;
            buletin_path = key;
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
    } catch (err: any) {
      console.error("[trupe_submissions] submit failed", err);
      toast.error("A apărut o eroare la trimitere.", {
        description: err?.message ?? String(err),
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
          className="mt-12 bg-background text-foreground p-8 md:p-14 space-y-16"
        >
          {/* ───────── despre spectacol ───────── */}
          <section className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-primary lowercase">
              despre spectacol
            </h2>

            <Field label="trupa" required>
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
              label="nume spectacol"
              required={!spectacolOptional}
              helper={spectacolOptional ? "opțional pentru această trupă" : undefined}
            >
              <Input
                value={numeSpectacol}
                onChange={(e) => setNumeSpectacol(e.target.value)}
                placeholder="…"
                required={!spectacolOptional}
              />
            </Field>

            <Field label="dramaturg" required>
              <Input
                value={dramaturg}
                onChange={(e) => setDramaturg(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field
              label="regizor, scenograf, coregraf, coloana sonoră etc."
              required
              helper="Prenume Nume - funcție"
            >
              <Input
                value={echipaCreativa}
                onChange={(e) => setEchipaCreativa(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field label="distribuție" required helper="Prenume Nume - funcție">
              <Input
                value={distributie}
                onChange={(e) => setDistributie(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field
              label="despre spectacol"
              required
              helper="descriere spectacol / povestea completă / scurt rezumat al piesei, nu viziunea regizorală (500-750 caractere cu spații)"
            >
              <Textarea
                value={despreSpectacol}
                onChange={(e) => setDespreSpectacol(e.target.value)}
                placeholder="…"
                rows={6}
                required
              />
            </Field>

            <Field label="necesar tehnic" required>
              <Textarea
                value={necesarTehnic}
                onChange={(e) => setNecesarTehnic(e.target.value)}
                placeholder="…"
                rows={4}
                required
              />
            </Field>

            <Field
              label="fotografie din spectacol sau de la repetiții"
              required
              helper="300 dpi, rezoluție minimă 1024×768 px, format: jpg, jpeg, png, tif, tiff"
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
                    <Field label="nume" required>
                      <Input
                        value={p.nume}
                        onChange={(e) => updateParticipant(i, "nume", e.target.value)}
                        placeholder="…"
                        required
                      />
                    </Field>
                    <Field label="prenume" required>
                      <Input
                        value={p.prenume}
                        onChange={(e) => updateParticipant(i, "prenume", e.target.value)}
                        placeholder="…"
                        required
                      />
                    </Field>
                  </div>

                  <Field label="funcție" required>
                    <Input
                      value={p.functie}
                      onChange={(e) => updateParticipant(i, "functie", e.target.value)}
                      placeholder="…"
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field label="vârstă" required>
                      <Input
                        type="number"
                        min={1}
                        value={p.varsta}
                        onChange={(e) => updateParticipant(i, "varsta", e.target.value)}
                        placeholder="…"
                        required
                      />
                    </Field>
                    <Field label="nr. telefon" required>
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
                    <Field label="mărime tricou" required>
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
                      label="restricții alimentare"
                      required
                      helper="ex: fără / vegetarian / alergii"
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
                    label="poză buletin"
                    required
                    helper="format: jpg, jpeg, png, pdf — stocat privat"
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

            <Field label="coordonator trupă" required helper="Prenume Nume">
              <Input
                value={coordNume}
                onChange={(e) => setCoordNume(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field label="vârstă coordonator" required>
              <Input
                value={coordVarsta}
                onChange={(e) => setCoordVarsta(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field label="tricou coordonator" required>
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

            <Field label="e-mail coordonator" required>
              <Input
                type="email"
                value={coordEmail}
                onChange={(e) => setCoordEmail(e.target.value)}
                placeholder="…"
                required
              />
            </Field>

            <Field label="nr. telefon coordonator" required>
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

            <Field label="persoană fizică / juridică?" required>
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
                <Field label="nume complet" required>
                  <Input
                    value={pfNumeComplet}
                    onChange={(e) => setPfNumeComplet(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="adresă" required>
                  <Input
                    value={pfAdresa}
                    onChange={(e) => setPfAdresa(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="CNP" required>
                  <Input
                    value={pfCnp}
                    onChange={(e) => setPfCnp(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="copie CI" required helper="format: jpg, jpeg, png, pdf">
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

                <Field label="nr. telefon" required>
                  <Input
                    type="tel"
                    value={pfTelefon}
                    onChange={(e) => setPfTelefon(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="e-mail" required>
                  <Input
                    type="email"
                    value={pfEmail}
                    onChange={(e) => setPfEmail(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="cont bancar" required>
                  <Input
                    value={pfContBancar}
                    onChange={(e) => setPfContBancar(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="banca" required>
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
                <Field label="nume persoană juridică" required>
                  <Input
                    value={pjNume}
                    onChange={(e) => setPjNume(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="sediu social" required>
                  <Input
                    value={pjSediu}
                    onChange={(e) => setPjSediu(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="CUI (codul unic de înregistrare) societate juridică" required>
                  <Input
                    value={pjCui}
                    onChange={(e) => setPjCui(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="numărul de ordine din Registrul Comerțului" required>
                  <Input
                    value={pjRegCom}
                    onChange={(e) => setPjRegCom(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="cont bancar" required>
                  <Input
                    value={pjContBancar}
                    onChange={(e) => setPjContBancar(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field label="banca" required>
                  <Input
                    value={pjBanca}
                    onChange={(e) => setPjBanca(e.target.value)}
                    placeholder="…"
                    required
                  />
                </Field>

                <Field
                  label="numele și funcția reprezentantului"
                  required
                  helper="Prenume Nume - funcție"
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

            <div className="flex items-start gap-3 pt-2">
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
                />{" "}
                și{" "}
                <LegalDialog
                  title="Politica de confidențialitate"
                  content={confidentialitateMd}
                  trigger={
                    <button type="button" className="text-primary underline">
                      Politica de confidențialitate
                    </button>
                  }
                />
                . *
              </Label>
            </div>

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
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm font-normal lowercase">
        {label} {required && "*"}
      </Label>
      <div className="mt-2">{children}</div>
      {helper && (
        <p className="mt-2 text-xs italic text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
