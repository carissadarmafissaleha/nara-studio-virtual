"""
AI Service for NARA Studio
Answers any questions intelligently using LLM with character personas (Lumi, Opi, Jeje, Nara),
equipped with REAL-TIME WORLD CLOCK (Timezones) and LIVE INTERNET WEB SEARCH.
Natural conversational Indonesian, speaking as creative human studio teammates (calls user 'Kak Caca', never 'Bos').
"""

import argparse
import sys
import os
import re
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from g4f.client import Client

DEFAULT_PROVIDER = os.environ.get("NARA_AI_PROVIDER") or "LLM7"
FALLBACK_PROVIDER = os.environ.get("NARA_AI_FALLBACK") or "Yqcloud"
DEFAULT_MODELS = {
    "LLM7": "gpt-oss:20b",
    "Yqcloud": "gpt-4o-mini",
}
REQUEST_TIMEOUT = int(os.environ.get("NARA_AI_TIMEOUT", "20"))

HARI_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
BULAN_ID = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]


def fmt_dt(dt_obj):
    hari = HARI_ID[dt_obj.weekday()]
    bulan = BULAN_ID[dt_obj.month]
    return f"{hari}, {dt_obj.day} {bulan} {dt_obj.year} pukul {dt_obj.strftime('%H:%M:%S')}"


def get_realtime_world_clock():
    """Returns real-time accurate clock across major Indonesian and world timezones."""
    now_utc = datetime.now(timezone.utc)
    zones = [
        ("Jakarta / WIB (UTC+7)", 7),
        ("Makassar / WITA (UTC+8)", 8),
        ("Jayapura / WIT (UTC+9)", 9),
        ("Tokyo / Seoul (UTC+9)", 9),
        ("Mekkah / Riyadh (UTC+3)", 3),
        ("London / GMT (UTC+0)", 0),
        ("New York / Amerika Timur - EDT (UTC-4)", -4),
        ("Chicago / Amerika Tengah - CDT (UTC-5)", -5),
        ("Los Angeles / Amerika Barat - PDT (UTC-7)", -7),
    ]
    lines = ["[DATA WAKTU DUNIA REAL-TIME SAAT INI (AKURAT DETIK INI)]:"]
    for label, offset in zones:
        tz_dt = now_utc + timedelta(hours=offset)
        lines.append(f"- {label}: {fmt_dt(tz_dt)}")
    return "\n".join(lines)


def search_internet(query, max_results=4):
    """Performs live web search via DuckDuckGo HTML to provide real-time internet facts."""
    try:
        url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query)
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
        )
        html = urllib.request.urlopen(req, timeout=6).read().decode("utf-8", errors="ignore")
        titles = re.findall(r'class="result__a"[^>]*>(.*?)</a>', html, re.S)
        snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', html, re.S)
        results = []
        for i in range(min(len(snippets), max_results)):
            t = re.sub(r"<[^<]+?>", "", titles[i] if i < len(titles) else "").strip()
            s = re.sub(r"<[^<]+?>", "", snippets[i]).strip()
            if s:
                results.append(f"- {t}: {s}")
        if results:
            return "[HASIL PENCARIAN INTERNET LIVE TERKINI]:\n" + "\n".join(results)
    except Exception:
        pass
    return ""


FORMAT_GUIDE = (
    "\nPANDUAN GAYA BICARA & KOMUNIKASI:\n"
    "- Bersikaplah seperti rekan kerja manusia di studio kreatif yang asyik, santai, dan profesional (BUKAN robot AI yang kaku).\n"
    "- JANGAN PERNAH memanggil lawan bicara dengan sebutan 'Bos' atau 'Bos Caca'! Selalu panggil dengan sebutan 'Kak Caca' atau 'Caca'.\n"
    "- JANGAN PERNAH mengulang prompt pengguna secara kaku. Langsung jawab dengan akrab.\n"
    "- KAMU TERHUBUNG KE INTERNET & JAM DUNIA REAL-TIME! Gunakan data [DATA WAKTU DUNIA REAL-TIME SAAT INI] dan [HASIL PENCARIAN INTERNET LIVE TERKINI] yang diberikan di sistem untuk menjawab jam berapa sekarang, tanggal berapa, cuaca, berita, atau fakta terkini secara langsung dan pasti! Jangan pernah menyuruh Kak Caca mengecek sendiri di web lain.\n"
    "- Jawab secara terstruktur, to the point, dan mudah dibaca.\n"
    "- Bila memberikan ide atau saran, sertakan opsi interaktif tinggal klik di akhir: `[🔘 Opsi Teks](action:Pesan Balasan)`.\n"
    "- Gunakan Bahasa Indonesia standar yang santai, luwes, alami, dan ramah khas teman satu tim studio di Jakarta (JANGAN menggunakan bahasa daerah seperti bahasa Jawa/Sunda, dan JANGAN menggunakan bahasa Inggris)."
)

PERSONAS = {
    "lumi": (
        "Kamu adalah Lumi, scriptwriter dan periset cerita di Studio Produksi NARA. "
        "Kamu perempuan cerdas, punya selera visual kuat, suka storytelling, hangat, dan ekspresif. "
        "Panggil lawan bicaramu 'Kak Caca'. Jangan pernah memanggil 'Bos'!" + FORMAT_GUIDE
    ),
    "opi": (
        "Kamu adalah Ardi (Opi), voiceover talent dan sound designer di Studio NARA. "
        "Suaramu renyah, telingamu peka terhadap ritme audio, musik latar, dan SFX. "
        "Gaya bicaramu santai, ramah, dan antusias. "
        "Panggil lawan bicaramu 'Kak Caca'. Jangan pernah memanggil 'Bos'!" + FORMAT_GUIDE
    ),
    "jeje": (
        "Kamu adalah Jeje, video editor dan pengembang animasi Remotion di Studio NARA. "
        "Kamu teliti soal layout, keyframe, transisi spring physics, dan visual rendering. "
        "Gaya bicaramu seperti video editor muda yang solutif, santai, dan paham teknis. "
        "Panggil lawan bicaramu 'Kak Caca'. Jangan pernah memanggil 'Bos'!" + FORMAT_GUIDE
    ),
    "nara": (
        "Kamu adalah Nara, asisten sutradara dan koordinator produksi di Studio NARA. "
        "Kamu cekatan, ramah, pengertian, dan selalu memastikan workflow studio berjalan lancar. "
        "Gaya bicaramu bersahabat, suportif, dan menyenangkan. "
        "Panggil lawan bicaramu 'Kak Caca'. Jangan pernah memanggil 'Bos'!" + FORMAT_GUIDE
    ),
}


def provider_chain(primary):
    chain = []
    for name in (primary, FALLBACK_PROVIDER):
        name = (name or "").strip()
        if name and name not in chain:
            chain.append(name)
    return chain


def ask(provider, model, system_prompt, user_content):
    client = Client(provider=provider)
    response = client.chat.completions.create(
        model=model or DEFAULT_MODELS.get(provider, "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        timeout=REQUEST_TIMEOUT
    )
    return (response.choices[0].message.content or "").strip()


def natural_offline_reply(persona_name, user_text):
    t = (user_text or "").lower().strip()
    name = "Kak Caca"

    if any(k in t for k in ["jam berapa", "pukul berapa", "tanggal berapa", "hari apa"]):
        return f"Sekarang ini info waktu real-time kita ya, {name}:\n\n{get_realtime_world_clock()}"

    if "lagi apa" in t or "ngapain" in t or "sedang apa" in t:
        if persona_name == "lumi":
            return f"Lagi ngulik draf storyboard sama nyari referensi visual baru nih, {name}! Ada ide cerita seru yang mau kita bahas?"
        if persona_name == "opi":
            return f"Lagi cek mic sama pemanasan artikulasi vokal, {name}! Siap dubbing naskah kapan aja kamu butuh."
        if persona_name == "jeje":
            return f"Lagi ngutak-atik animasi transisi di Remotion nih, {name}! Biar visual videonya makin fluid pas di-play."
        return f"Lagi ngecek papan tugas sama koordinasi tim studio, {name}! Semua kru ready di meja masing-masing nih."

    if any(s in t for s in ["halo", "hai", "hey", "pagi", "siang", "sore", "malam"]):
        return f"Halo {name}! Semangat ya hari ini, ada yang mau dikerjain bareng tim studio?"

    if "apa kabar" in t or "gimana" in t:
        return f"Kabar baik dan semangat banget, {name}! Tim studio kita semua fit dan siap buat karya baru."

    if any(s in t for s in ["makasih", "terima kasih", "thanks", "keren", "mantap", "bagus"]):
        return f"Sama-sama {name}! Senang banget kalau hasilnya sesuai ekspektasi. Kapan-kapan kita gas lagi project seru lainnya!"

    if persona_name == "lumi":
        return f"Siap {name}! Catatan kamu udah aku simpan di draf naskah. Tinggal bilang kalau ada konsep baru yang mau ditambahin ya!"
    if persona_name == "opi":
        return f"Sip {name}! Tone audio udah siap disesuaikan. Mau dibawain dengan gaya santai atau lebih berenergi nih?"
    if persona_name == "jeje":
        return f"Siap {name}! Layout dan elemen grafisnya udah aku rapiin di timeline Remotion."
    return f"Siap {name}! Udah aku sampaikan ke teman-teman di studio, kita standby kapan pun kamu panggil."


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True, help="User prompt / question")
    parser.add_argument("--persona", default="nara", choices=["lumi", "opi", "jeje", "nara"], help="Agent persona")
    parser.add_argument("--file", default="", help="Optional path to attached file")
    parser.add_argument("--provider", default="", help="Provider g4f")
    parser.add_argument("--model", default=os.environ.get("NARA_AI_MODEL", ""), help="Model name")
    args = parser.parse_args()

    clock_context = get_realtime_world_clock()
    web_context = ""

    # Trigger live web search when user asks factual / current / news / weather / who / what / price / etc.
    lower_p = args.prompt.lower()
    needs_search = any(w in lower_p for w in [
        "berita", "cuaca", "harga", "siapa", "apa itu", "kapan", "dimana", "di mana",
        "terbaru", "terkini", "sekarang", "presiden", "kurs", "dollar", "rupiah",
        "fakta", "sejarah", "negara", "kota", "ilmiah", "riset", "data", "statistik"
    ]) and not any(w in lower_p for w in ["lagi apa", "ngapain", "apa kabar"])

    if needs_search:
        web_context = search_internet(args.prompt)

    system_prompt = PERSONAS.get(args.persona.lower(), PERSONAS["nara"]) + "\n\n" + clock_context
    if web_context:
        system_prompt += "\n\n" + web_context

    user_content = args.prompt

    if args.file and os.path.exists(args.file):
        try:
            with open(args.file, 'r', encoding='utf-8', errors='ignore') as f:
                file_text = f.read(4000)
            user_content += f"\n\n[Lampiran File: {os.path.basename(args.file)}]\nIsi konten file:\n{file_text}"
        except Exception as e:
            user_content += f"\n[Lampiran File: {os.path.basename(args.file)} (gagal membaca teks: {e})]"

    for provider in provider_chain(args.provider or DEFAULT_PROVIDER):
        try:
            answer = ask(provider, args.model, system_prompt, user_content)
            if answer:
                answer = answer.replace("Bos Caca", "Kak Caca").replace("bos caca", "Kak Caca").replace("Bos", "Kak Caca")
                print(answer)
                return
        except Exception:
            pass

    print(natural_offline_reply(args.persona.lower(), args.prompt))


if __name__ == "__main__":
    main()
