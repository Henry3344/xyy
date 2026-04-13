#!/usr/bin/env python3
"""Generate js/showcard-words-data.js — run from repo root: python3 tools/gen_showcard_words.py"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
OUT = ROOT / "js" / "showcard-words-data.js"

# American-English approximations: ipa fragment (no outer slashes), Chinese homophone
W: dict[str, dict[str, str]] = {}

def add(k: str, ipa: str, hom: str):
    W[k.lower()] = {"ipa": ipa, "homophone": hom}

# --- Core function words & glue (templates + combos) ---
for k, ipa, hom in [
    ("hi", "haɪ", "害"),
    ("i", "aɪ", "艾"),
    ("i'm", "aɪm", "艾木"),
    ("i'd", "aɪd", "艾德"),
    ("i'll", "aɪl", "艾欧"),
    ("i've", "aɪv", "艾夫"),
    ("i'd", "aɪd", "艾德"),
    ("it's", "ɪts", "伊茨"),
    ("it", "ɪt", "伊特"),
    ("it'll", "ˈɪtəl", "伊特欧"),
    ("it'll", "ˈɪtəl", "伊特欧"),
    ("we", "wiː", "威"),
    ("we're", "wɪr", "威尔"),
    ("you", "juː", "优"),
    ("you're", "jʊr", "哟"),
    ("your", "jʊr", "哟"),
    ("he", "hiː", "嘿"),
    ("she", "ʃiː", "西"),
    ("they", "ðeɪ", "贼"),
    ("my", "maɪ", "迈"),
    ("me", "miː", "米"),
    ("a", "ə / eɪ", "厄/诶"),
    ("an", "æn / ən", "安/恩"),
    ("the", "ðə / ðiː", "则/迪"),
    ("to", "tuː / tə", "吐/特"),
    ("of", "ʌv / əv", "厄夫"),
    ("for", "fɔːr / fər", "佛/佛儿"),
    ("and", "ænd / ən", "安德/恩"),
    ("or", "ɔːr", "奥尔"),
    ("but", "bʌt", "巴特"),
    ("so", "soʊ", "搜"),
    ("if", "ɪf", "伊夫"),
    ("in", "ɪn", "因"),
    ("on", "ɑːn / ɔːn", "昂"),
    ("at", "æt / ət", "艾特/厄特"),
    ("by", "baɪ", "拜"),
    ("with", "wɪð / wɪθ", "维兹/维斯"),
    ("from", "frʌm", "夫拉姆"),
    ("up", "ʌp", "阿普"),
    ("out", "aʊt", "奥特"),
    ("off", "ɔːf", "奥夫"),
    ("down", "daʊn", "当"),
    ("over", "ˈoʊvər", "欧沃"),
    ("is", "ɪz", "伊兹"),
    ("am", "æm", "安姆"),
    ("are", "ɑːr / ər", "阿/尔"),
    ("was", "wɑːz / wəz", "沃兹"),
    ("were", "wɜːr", "沃"),
    ("be", "biː", "毕"),
    ("been", "bɪn", "宾"),
    ("being", "ˈbiːɪŋ", "毕英"),
    ("have", "hæv / həv", "嗨夫/厄夫"),
    ("has", "hæz", "嗨兹"),
    ("had", "hæd", "嗨德"),
    ("do", "duː / də", "杜/德"),
    ("does", "dʌz", "达兹"),
    ("did", "dɪd", "迪德"),
    ("don't", "doʊnt", "东特"),
    ("doesn't", "ˈdʌznt", "达怎特"),
    ("didn't", "ˈdɪdnt", "迪登特"),
    ("can't", "kænt", "康特"),
    ("won't", "woʊnt", "旺特"),
    ("not", "nɑːt", "诺特"),
    ("no", "noʊ", "诺"),
    ("yes", "jɛs", "耶斯"),
    ("please", "pliːz", "普利兹"),
    ("sorry", "ˈsɑːri", "萨瑞"),
    ("excuse", "ɪkˈskjuːz", "伊克斯丘兹"),
    ("help", "help", "嘿欧普"),
    ("hello", "həˈloʊ", "哈喽"),
    ("hi,", "haɪ", "害"),
    ("oh", "oʊ", "欧"),
    ("well", "wel", "歪欧"),
    ("really", "ˈrɪli", "瑞利"),
    ("very", "ˈveri", "歪瑞"),
    ("just", "ʤʌst", "贾斯特"),
    ("only", "ˈoʊnli", "欧利"),
    ("also", "ˈɔːlsoʊ", "奥尔搜"),
    ("too", "tuː", "吐"),
    ("here", "hɪr", "嘿儿"),
    ("there", "ðer", "戴尔"),
    ("there's", "ðerz", "戴尔兹"),
    ("where", "wer", "外儿"),
    ("when", "wen", "温"),
    ("what", "wɑːt / wʌt", "沃特/瓦特"),
    ("who", "huː", "乎"),
    ("why", "waɪ", "外"),
    ("how", "haʊ", "好"),
    ("how's", "haʊz", "好兹"),
    ("which", "wɪʧ", "维奇"),
    ("can", "kæn / kən", "看/肯"),
    ("could", "kʊd", "酷的"),
    ("would", "wʊd", "伍德"),
    ("should", "ʃʊd", "舒德"),
    ("will", "wɪl", "威欧"),
    ("shall", "ʃæl", "夏欧"),
    ("may", "meɪ", "梅"),
    ("might", "maɪt", "迈特"),
    ("must", "mʌst", "马斯特"),
    ("let's", "lets", "莱茨"),
    ("let", "lɛt", "莱特"),
    ("make", "meɪk", "梅克"),
    ("go", "ɡoʊ", "沟"),
    ("going", "ˈɡoʊɪŋ", "沟英"),
    ("get", "ɡɛt", "盖特"),
    ("got", "ɡɑːt", "哥特"),
    ("give", "ɡɪv", "吉夫"),
    ("take", "teɪk", "泰克"),
    ("put", "pʊt", "普特"),
    ("come", "kʌm", "卡姆"),
    ("see", "siː", "西"),
    ("know", "noʊ", "诺"),
    ("think", "θɪŋk", "辛克"),
    ("say", "seɪ", "塞"),
    ("said", "sɛd", "赛德"),
    ("tell", "tel", "泰尔"),
    ("ask", "æsk", "阿斯克"),
    ("call", "kɔːl", "考欧"),
    ("try", "traɪ", "吹"),
    ("use", "juːz", "优兹"),
    ("need", "niːd", "尼德"),
    ("want", "wɑːnt", "旺特"),
    ("like", "laɪk", "赖克"),
    ("look", "lʊk", "路克"),
    ("find", "faɪnd", "凡德"),
    ("feel", "fiːl", "菲尔"),
    ("keep", "kiːp", "基普"),
    ("let", "lɛt", "莱特"),
    ("send", "send", "森德"),
    ("show", "ʃoʊ", "秀"),
    ("write", "raɪt", "瑞特"),
    ("read", "riːd", "瑞德"),
    ("speak", "spiːk", "斯毕克"),
    ("talk", "tɔːk", "托克"),
    ("listen", "ˈlɪsən", "利森"),
    ("hear", "hɪr", "嘿儿"),
    ("wait", "weɪt", "威特"),
    ("stop", "stɑːp", "斯剁普"),
    ("start", "stɑːrt", "斯达特"),
    ("turn", "tɜːrn", "特恩"),
    ("move", "muːv", "木夫"),
    ("live", "lɪv", "立文"),
    ("work", "wɜːrk", "沃克"),
    ("pay", "peɪ", "佩"),
    ("buy", "baɪ", "拜"),
    ("sell", "sɛl", "塞欧"),
    ("open", "ˈoʊpən", "欧盆"),
    ("close", "kloʊz", "克娄兹"),
    ("this", "ðɪs", "迪斯"),
    ("that", "ðæt", "戴特"),
    ("these", "ðiːz", "迪兹"),
    ("those", "ðoʊz", "豆兹"),
    ("then", "ðen", "恩"),
    ("than", "ðæn / ðən", "赞/赞"),
    ("now", "naʊ", "闹"),
    ("today", "təˈdeɪ", "特得"),
    ("tomorrow", "təˈmɑːroʊ", "特莫柔"),
    ("tonight", "təˈnaɪt", "特奈特"),
    ("soon", "suːn", "孙"),
    ("again", "əˈɡɛn", "厄根"),
    ("once", "wʌns", "万斯"),
    ("maybe", "ˈmeɪbi", "梅比"),
    ("about", "əˈbaʊt", "厄抱特"),
    ("into", "ˈɪntuː", "因吐"),
    ("through", "θruː", "斯鲁"),
    ("after", "ˈæftər", "阿夫特"),
    ("before", "bɪˈfɔːr", "比佛"),
    ("because", "bɪˈkɔːz", "比考兹"),
    ("some", "sʌm", "萨姆"),
    ("any", "ˈeni", "埃尼"),
    ("every", "ˈevri", "艾夫瑞"),
    ("all", "ɔːl", "奥尔"),
    ("each", "iːʧ", "伊奇"),
    ("both", "boʊθ", "波斯"),
    ("more", "mɔːr", "莫"),
    ("most", "moʊst", "莫斯特"),
    ("much", "mʌʧ", "马奇"),
    ("many", "ˈmeni", "梅尼"),
    ("few", "fjuː", "夫优"),
    ("such", "sʌʧ", "萨奇"),
    ("other", "ˈʌðər", "阿泽"),
    ("same", "seɪm", "塞姆"),
    ("new", "nuː", "牛"),
    ("old", "oʊld", "欧德"),
    ("good", "ɡʊd", "古德"),
    ("bad", "bæd", "拜德"),
    ("big", "bɪɡ", "比格"),
    ("small", "smɔːl", "斯莫"),
    ("long", "lɔːŋ", "朗"),
    ("high", "haɪ", "害"),
    ("right", "raɪt", "瑞特"),
    ("left", "lɛft", "莱夫特"),
    ("first", "fɜːrst", "佛斯特"),
    ("last", "læst", "拉斯特"),
    ("next", "nekst", "奈克斯特"),
    ("main", "meɪn", "门"),
    ("free", "friː", "夫瑞"),
    ("sure", "ʃʊr", "舒尔"),
    ("ok", "ˌoʊˈkeɪ", "欧凯"),
    ("thank", "θæŋk", "桑克"),
    ("thanks", "θæŋks", "桑克斯"),
    ("welcome", "ˈwelkəm", "歪欧克姆"),
    ("bye", "baɪ", "拜"),
]:
    add(k, ipa, hom)

# --- Numbers (tokens) ---
for k, ipa, hom in [
    ("2", "tuː", "吐"),
    ("3", "θriː", "斯瑞"),
    ("30", "ˈθɜːrti", "瑟提"),
    ("302", "θriː ˈoʊ tuː", "斯瑞 欧 吐"),
    ("5b", "faɪv biː", "夫艾夫 比"),
    ("7", "ˈsɛvən", "塞文"),
]:
    add(k, ipa, hom)

# Long tracking number chip — read digit-by-digit homophone
add(
    "9400111899223344",
    "naɪn fɔːr ... (digits)",
    "按数字跟读或听旁🔊",
)

# --- Remaining vocabulary (chips + templates): bulk ---
BULK = r"""
neighbor|ˈneɪbər|内波儿
moving|ˈmuːvɪŋ|木文
living|ˈlɪvɪŋ|立文
door|dɔːr|朵
downstairs|ˈdaʊnsterz|当斯戴尔兹
upstairs|ˈʌpsterz|阿普斯戴尔兹
building|ˈbɪldɪŋ|比偶定
apt|æpt|爱普特
unit|ˈjuːnɪt|优尼特
exit|ˈɛɡzɪt|埃格齐特
elevator|ˈɛlɪveɪtər|艾勒维特
mailroom|ˈmeɪlruːm|梅鲁姆
gym|ʤɪm|吉姆
mail|meɪl|梅欧
address|ˈædres|安坠斯
far|fɑːr|法
restroom|ˈrestruːm|瑞斯戳姆
bathroom|ˈbæθruːm|巴斯鲁姆
charger|ˈʧɑːrʤər|恰泽
phone|foʊn|冯
wifi|ˈwaɪfaɪ|歪法艾
urgent|ˈɜːrdʒənt|厄津特
quick|kwɪk|奎克
important|ɪmˈpɔːrtnt|伊姆泡特恩特
necessary|ˈnesəseri|奈瑟瑟瑞
emergency|ɪˈmɜːrdʒənsi|伊默津西
account|əˈkaʊnt|厄康特
deposit|dɪˈpɑːzɪt|迪帕兹特
withdraw|wɪðˈdrɔː|维兹抓
exchange|ɪksˈʧeɪndʒ|伊克斯琴奇
currency|ˈkɜːrənsi|克伦西
wire|ˈwaɪər|歪尔
passport|ˈpæspɔːrt|帕斯泡特
debit|ˈdɛbɪt|戴比特
check|ʧek|切克
application|ˌæplɪˈkeɪʃən|安普利凯申
form|fɔːrm|佛姆
credit|ˈkrɛdɪt|克瑞迪特
card|kɑːrd|卡德
cash|kæʃ|开史
apple|ˈæpəl|安剖
gift|ɡɪft|吉夫特
plastic|ˈplæstɪk|普拉斯提克
bags|bæɡz|拜格兹
receipt|rɪˈsiːt|瑞西特
discounts|ˈdɪskaʊnts|迪斯康茨
wrapping|ˈræpɪŋ|瑞平
steak|steɪk|斯泰克
salad|ˈsæləd|萨勒德
burger|ˈbɜːrɡər|伯格儿
pasta|ˈpɑːstə|帕斯塔
water|ˈwɔːtər|沃特儿
onions|ˈʌnjənz|阿尼恩兹
ice|aɪs|艾斯
spice|spaɪs|斯派斯
sugar|ˈʃʊɡər|舒格
cilantro|sɪˈlæntroʊ|西兰楚
split|splɪt|斯普利特
bill|bɪl|比欧
share|ʃer|晒尔
dessert|dɪˈzɜːrt|迪泽特
drink|drɪŋk|德林克
dutch|dʌʧ|达奇
house|haʊs|豪斯
boss|bɔːs|波斯
company|ˈkʌmpəni|康帕尼
treat|triːt|吹特
everything|ˈevriθɪŋ|艾夫瑞辛
family|ˈfæmɪli|凡米利
dog|dɔːɡ|朵格
life|laɪf|赖夫
catch|kætʃ|凯奇
hang|hæŋ|杭
grab|ɡræb|格瑞布
coffee|ˈkɔːfi|考菲
touch|tʌʧ|塔奇
dinner|ˈdɪnər|迪讷
jfk|ˌdʒeɪ ef ˈkeɪ|杰·艾夫·凯
airport|ˈerpɔːrt|艾尔泡特
times|taɪmz|泰姆兹
square|skwer|斯奎尔
flushing|ˈflʌʃɪŋ|弗拉辛
street|striːt|斯特里特
across|əˈkrɔːs|厄克绕斯
corner|ˈkɔːrnər|考讷
light|laɪt|赖特
hotel|hoʊˈtel|侯泰欧
doctor|ˈdɑːktər|道克特
ambulance|ˈæmbjələns|安布尤伦斯
police|pəˈliːs|波利斯
translator|trænzˈleɪtər|川斯累特
dizzy|ˈdɪzi|迪兹
pain|peɪn|佩恩
sick|sɪk|西克
hurt|hɜːrt|赫特
cannot|ˈkænɑːt|坎诺特
breathe|briːð|布瑞兹
slower|ˈsloʊər|斯洛沃
translate|trænzˈleɪt|川斯累特
english|ˈɪŋɡlɪʃ|英格利什
understand|ˌʌndərˈstænd|安德斯坦德
return|rɪˈtɜːrn|瑞特恩
refund|ˈriːfʌnd|瑞方德
cancel|ˈkænsəl|坎瑟欧
broken|ˈbroʊkən|布柔肯
wrong|rɔːŋ|朗
size|saɪz|赛兹
working|ˈwɜːrkɪŋ|沃金
expired|ɪkˈspaɪərd|伊斯派尔德
appointment|əˈpɔɪntmənt|厄泡因特门特
reschedule|ˌriːˈskɛʤuːl|瑞斯凯久欧
confirm|kənˈfɜːrm|肯佛姆
book|bʊk|布克
table|ˈteɪbəl|泰伯欧
noon|nuːn|努恩
morning|ˈmɔːrnɪŋ|莫宁
week|wiːk|维克
heating|ˈhiːtɪŋ|黑廷
hot|hɑːt|哈特
leaky|ˈliːki|立ki
faucet|ˈfɔːsɪt|佛西特
lock|lɑːk|落克
ceiling|ˈsiːlɪŋ|西灵
window|ˈwɪndoʊ|温斗
several|ˈsɛvərəl|塞夫惹弱
days|deɪz|戴兹
package|ˈpækɪdʒ|派基奇
registered|ˈrɛʤɪstərd|瑞基斯特德
letter|ˈlɛtər|莱特
certified|ˈsɜːrtɪfaɪd|瑟提费德
international|ˌɪntərˈnæʃənəl|因特纳申诺
parcel|ˈpɑːrsəl|帕瑟欧
tracking|ˈtrækɪŋ|川金
number|ˈnʌmbər|南伯
notice|ˈnoʊtɪs|诺提斯
headache|ˈhɛdeɪk|嗨得克
cold|koʊld|扣德
stomachache|ˈstʌməkˌeɪk|斯塔默克诶克
allergies|ˈælərʤiz|安勒基兹
cough|kɔːf|考夫
fever|ˈfiːvər|菲沃
throat|θroʊt|斯柔特
safe|seɪf|塞夫
kids|kɪdz|基兹
generic|ʤəˈnɛrɪk|哲奈里克
version|ˈvɜːrʒən|沃珍
nice|naɪs|奈斯
meet|miːt|密特
bother|ˈbɑːðər|巴泽
something|ˈsʌmθɪŋ|萨姆辛
problem|ˈprɑːbləm|普绕布勒姆
someone|ˈsʌmwʌn|萨姆万
sometime|ˈsʌmtaɪm|萨姆泰姆
downtown|ˈdaʊntaʊn|当汤
manhattan|mænˈhætən|曼哈腾
drop|drɑːp|抓普
damaged|ˈdæmɪdʒd|戴米知德
ice|aɪs|艾斯
offer|ˈɔːfər|奥佛
bathroom|ˈbæθruːm|巴斯鲁姆
pm|ˌpiːˈɛm|皮·艾姆
id|ˌaɪˈdiː|艾迪
money|ˈmʌni|马尼
pick|pɪk|匹克
tracking|ˈtrækɪŋ|川金
back|bæk|拜克
counter|ˈkaʊntər|康特
drowsy|ˈdraʊzi|抓兹
e|iː|伊
fix|fɪks|菲克斯
front|frʌnt|夫朗特
item|ˈaɪtəm|艾特姆
looking|ˈlʊkɪŋ|路金
name|neɪm|内姆
non|nɑːn|南
sore|sɔːr|索尔
time|taɪm|泰姆
way|weɪ|威
"""

for line in BULK.strip().splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    parts = line.split("|")
    if len(parts) != 3:
        continue
    add(parts[0].strip(), parts[1].strip(), parts[2].strip())

# Special multi-char tokens
add("[your name]", "jʊr neɪm", "哟 内姆")
add("non-drowsy", "nɑːn ˈdraʊzi", "南 抓兹")
add("over-the-counter", "ˈoʊvər ðə ˈkaʊntər", "欧沃 则 康特")
add("speak english well", "spiːk ˈɪŋɡlɪʃ wel", "斯毕克 英格利什 歪欧")
add("say that again", "seɪ ðæt əˈɡɛn", "塞 戴特 厄根")
add("write it down", "raɪt ɪt daʊn", "瑞特 伊特 当")
add("show me", "ʃoʊ miː", "秀 米")
add("get it", "ɡɛt ɪt", "盖特 伊特")
add("hear you", "hɪr juː", "嘿儿 优")
add("try this on", "traɪ ðɪs ɑːn", "吹 迪斯 昂")
add("not working", "nɑːt ˈwɜːrkɪŋ", "诺特 沃金")
add("the wrong size", "ðə rɔːŋ saɪz", "则 朗 赛兹")
add("too small", "tuː smɔːl", "吐 斯莫")
add("book a table", "bʊk ə ˈteɪbəl", "布克 厄 泰伯欧")
add("tomorrow morning", "təˈmɑːroʊ ˈmɔːrnɪŋ", "特莫柔 莫宁")
add("next week", "nekst wiːk", "奈克斯特 维克")
add("a leaky faucet", "ə ˈliːki ˈfɔːsɪt", "厄 立ki 佛西特")
add("a broken window", "ə ˈbroʊkən ˈwɪndoʊ", "厄 布柔肯 温斗")
add("more than a week", "mɔːr ðən ə wiːk", "莫 赞 厄 维克")
add("a few", "ə fjuː", "厄 夫优")
add("a registered letter", "ə ˈrɛʤɪstərd ˈlɛtər", "厄 瑞基斯特德 莱特")
add("a certified letter", "ə ˈsɜːrtɪfaɪd ˈlɛtər", "厄 瑟提费德 莱特")
add("an international parcel", "ən ˌɪntərˈnæʃənəl ˈpɑːrsəl", "安 因特纳申诺 帕瑟欧")
add("on my phone", "ɑːn maɪ foʊn", "昂 迈 冯")
add("right here", "raɪt hɪr", "瑞特 嘿儿")
add("i have the notice", "aɪ hæv ðə ˈnoʊtɪs", "艾 嗨夫 则 诺提斯")
add("safe for kids", "seɪf fɔːr kɪdz", "塞夫 佛 基兹")
add("the generic version", "ðə ʤəˈnɛrɪk ˈvɜːrʒən", "则 哲奈里克 沃珍")

# Extract tokens from index and warn / fill fallbacks
html = INDEX.read_text(encoding="utf-8")
chips = re.findall(r'<span class="chip-en">([^<]+)</span>', html)
blocks = re.findall(r'class="english-sentence"[^>]*>(.*?)</div>', html, re.DOTALL)
combos = re.findall(r'class="combo-text"[^>]*>([^<]+)</div>', html)
need = set()
for c in chips + combos:
    for w in re.findall(r"[a-zA-Z0-9']+", c.lower()):
        need.add(w)
for b in blocks:
    text = re.sub(r"<[^>]+>", " ", b)
    for w in re.findall(r"[a-zA-Z0-9']+", text.lower()):
        need.add(w)

missing = sorted(need - set(W.keys()))
if missing:
    raise SystemExit("Missing SHOWCARD_WORDS for tokens: " + ", ".join(missing))

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    "// Generated by tools/gen_showcard_words.py — do not edit by hand\nwindow.SHOWCARD_WORDS = "
    + json.dumps(W, ensure_ascii=False, indent=0)
    + ";\n",
    encoding="utf-8",
)
print("written", OUT, "entries", len(W))
