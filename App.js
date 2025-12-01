import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert, 
  Animated, 
  Easing, 
  Image, 
  Platform,
  LogBox,
  Modal,
  Switch
} from 'react-native';

// Uyarıları gizle
LogBox.ignoreAllLogs(true);

import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { PrayerTimes, Coordinates, CalculationMethod, Qibla } from 'adhan';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Audio } from 'expo-av'; // expo-audio yerine expo-av kullanıyoruz
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRAYER_NAMES = {
  fajr: 'İmsak',
  sunrise: 'Güneş',
  dhuhr: 'Öğle',
  asr: 'İkindi',
  maghrib: 'Akşam',
  isha: 'Yatsı'
};

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

// Namaz Bilgileri
const PRAYER_DETAILS = {
  fajr: {
    name: 'İmsak',
    rakats: '4 Rekat',
    detail: '2 Sünnet, 2 Farz',
    shortSurah: 'İhlas Suresi (Kul hüvallahu ehad...)',
    dua: '“Allah’ım, bu sabahı bize hayırlı ve bereketli kıl.”',
    quranVerse: '“Namaz, müminlere vakitli olarak farz kılınmıştır.” (Nisa 103)',
    commentary: 'Günü teslimiyetle açmak, kalbi günün ritmine hazırlamak demektir.',
  },
  sunrise: {
    name: 'Güneş',
    rakats: 'Kerahat Vakti',
    detail: 'Bayram namazı haricinde namaz kılınmaz.',
    shortSurah: 'Bu vakitte namaz kılınmaz; tesbih ve salavat tavsiye edilir.',
    dua: '“Elhamdülillahillezi ahyâna...” ile güne şükredin.',
    quranVerse: '“Güneş doğmazdan önce ve batmadan önce Rabbinizi tesbih edin.” (Taha 130)',
    commentary: 'Kalbi zikre ayırmak, niyetlerinizi tazelemek için ideal bir pencere.',
  },
  dhuhr: {
    name: 'Öğle',
    rakats: '10 Rekat',
    detail: '4 İlk Sünnet, 4 Farz, 2 Son Sünnet',
    shortSurah: 'Asr Suresi (Vel asr...)',
    dua: '“Ya Rabbi, gün ortasında gafletten koru.”',
    quranVerse: '“Gündüzün iki tarafında ve gecenin yakın saatlerinde namaz kıl.” (Hud 114)',
    commentary: 'Yoğunlukta kısa bir teneffüs; nefesinizi derleyip kalbinizi yenileyin.',
  },
  asr: {
    name: 'İkindi',
    rakats: '8 Rekat',
    detail: '4 Sünnet, 4 Farz',
    shortSurah: 'Kevser veya Maun sureleri tavsiye edilir.',
    dua: '“Allah’ım, kalan zamanı bereketli kıl.”',
    quranVerse: '“Andolsun zamana ki, insan hüsrandadır; ancak iman edip salih amel işleyenler müstesna.” (Asr 1-3)',
    commentary: 'Günün ikinci nefesi; yorulan kalbi yeniden hizaya çeker.',
  },
  maghrib: {
    name: 'Akşam',
    rakats: '5 Rekat',
    detail: '3 Farz, 2 Sünnet',
    shortSurah: 'Kafirun + İhlas kombinasyonu uygulanabilir.',
    dua: '“Ey Rabbimiz, bizi karanlığın şerrinden muhafaza eyle.”',
    quranVerse: '“O’nun ayetlerinden biri de geceyi ve gündüzü yaratmasıdır.” (Rum 23)',
    commentary: 'Günün kapanış perdesi; aile içi birlik ve beraberlik vurgusu taşır.',
  },
  isha: {
    name: 'Yatsı',
    rakats: '13 Rekat',
    detail: '4 İlk Sünnet, 4 Farz, 2 Son Sünnet, 3 Vitir',
    shortSurah: 'Şems veya Leyl sureleri kalbi dinginleştirir.',
    dua: '“Rabbim, geceyi bize huzur, uykumuzu ibadet eyle.”',
    quranVerse: '“Gecenin bir kısmında da namaz kıl; bu senin için ayrıca bir nafiledir.” (İsra 79)',
    commentary: 'Gecenin sessizliğinde teslimiyet, kalbin dinlenme vaktidir.',
  },
};

// Ses dosyaları
const SOUND_FILES = {
  fajr: require('./assets/sounds/imsak.mp3'),
  dhuhr: require('./assets/sounds/ogle.mp3'),
  asr: require('./assets/sounds/ikindi.mp3'),
  maghrib: require('./assets/sounds/aksam.mp3'),
  isha: require('./assets/sounds/yatsi.mp3'),
};

const RELIGIOUS_DAYS = [
  { year: 2026, date: '2026-01-15', name: 'Miraç Kandili' },
  { year: 2026, date: '2026-02-02', name: 'Berat Kandili' },
  { year: 2026, date: '2026-02-18', name: 'Ramazan Başlangıcı' },
  { year: 2026, date: '2026-03-15', name: 'Kadir Gecesi' },
  { year: 2026, date: '2026-03-20', name: 'Ramazan Bayramı (1. Gün)' },
  { year: 2026, date: '2026-05-27', name: 'Kurban Bayramı (1. Gün)' },
  { year: 2026, date: '2026-06-17', name: 'Hicri Yılbaşı' },
  { year: 2026, date: '2026-06-26', name: 'Aşure Günü' },
  { year: 2026, date: '2026-10-21', name: 'Mevlid Kandili' },
  { year: 2027, date: '2027-01-05', name: 'Miraç Kandili' },
  { year: 2027, date: '2027-01-22', name: 'Berat Kandili' },
  { year: 2027, date: '2027-02-08', name: 'Ramazan Başlangıcı' },
  { year: 2027, date: '2027-03-05', name: 'Kadir Gecesi' },
  { year: 2027, date: '2027-03-09', name: 'Ramazan Bayramı (1. Gün)' },
  { year: 2027, date: '2027-05-16', name: 'Kurban Bayramı (1. Gün)' },
  { year: 2027, date: '2027-06-07', name: 'Hicri Yılbaşı' },
  { year: 2027, date: '2027-06-16', name: 'Aşure Günü' },
  { year: 2027, date: '2027-10-10', name: 'Mevlid Kandili' },
];

const FOCUS_REFLECTIONS = [
  {
    title: 'Vakit Bilinci',
    body: 'Her vakit, gününüzü yeniden şekillendirmek için verilen küçük bir fırsattır.',
  },
  {
    title: 'Sükûnet',
    body: 'Kıbleyi bulurken kalbiniz de yönünü bulsun; niyetiniz pusulanız olsun.',
  },
  {
    title: 'Şükür',
    body: 'Vakitlerin düzeni, hayatın içindeki rahmetin ritmini fısıldar.',
  },
  {
    title: 'Hazırlık',
    body: 'Ezan henüz duyulmadıysa bile kalbinizi vakte hazırlamak sizde.',
  },
];

const HERO_GRADIENT = ['#010817', '#031126', '#0B1831', '#0f172a'];

const ZIKR_GOALS = [
  {
    key: 'morningTasbih',
    label: 'Sabah Tesbihatı',
    period: 'Günlük',
    target: 33,
    unit: 'tesbih',
    suggestion: 'Subhanallah, Elhamdulillah, Allahu Ekber tesbihatını 33’er defa tekrar edin.',
    reminder: 'İmsak sonrası 5 dakikalık sessiz bir alan oluşturun.',
    color: '#38bdf8',
  },
  {
    key: 'salawat',
    label: 'Salavat Zinciri',
    period: 'Günlük',
    target: 50,
    unit: 'salavat',
    suggestion: '“Allahümme salli ala Seyyidina Muhammed” ile gönlünüzü yumuşatın.',
    reminder: 'Öğle ve ikindi arası kısa molalarda 10’ar tekrar hedefleyin.',
    color: '#f472b6',
  },
  {
    key: 'weeklyYasin',
    label: 'Haftalık Yasin',
    period: 'Haftalık',
    target: 1,
    unit: 'hatim',
    suggestion: 'Hafta boyunca parçalara bölüp Yasin-i Şerif’i tamamlayın.',
    reminder: 'Cumartesi sabahı veya Perşembe akşamı sessiz bir zaman belirleyin.',
    color: '#34d399',
  },
];

const YASIN_TEXT = String.raw`Yasin Suresi (1-12. Ayetler)

1. Ayet

Okunuşu: Yâ-Sîn.

Anlamı: Yâsîn.

2. Ayet

Okunuşu: Vel-Kur'ânil-hakîm.

Anlamı: Hikmet dolu Kur'an'a andolsun ki,

3. Ayet

Okunuşu: İnneke leminel-murselîn.

Anlamı: Sen elbette (peygamber) gönderilenlerdensin.

4. Ayet

Okunuşu: Alâ sırâtın mustekîm.

Anlamı: Dosdoğru bir yol üzeresin.

5. Ayet

Okunuşu: Tenzîlel-azîzir-rahîm.

Anlamı: Kur'an, mutlak güç sahibi, çok merhametli Allah tarafından indirilmiştir.

6. Ayet

Okunuşu: Litunzira kavmen mâ unzira âbâuhum fehum gâfilûn.

Anlamı: Ataları uyarılmamış, bu yüzden de gaflet içinde olan bir kavmi uyarman için indirilmiştir.

7. Ayet

Okunuşu: Lekad hakkal-kavlu alâ ekserihim fehum lâ yu'minûn.

Anlamı: Andolsun, onların çoğu üzerine o söz (azap) hak olmuştur. Artık onlar iman etmezler.

8. Ayet

Okunuşu: İnnâ cealnâ fî a'nâkıhim aglâlen fehiye ilel-ezkâni fehum mukmehûn.

Anlamı: Onların boyunlarına demir halkalar geçirdik, o halkalar çenelerine dayanmıştır. Bu sebeple kafaları yukarıya kalkık durumdadır.

9. Ayet

Okunuşu: Ve cealnâ min beyni eydîhim sedden ve min halfihim sedden feağşeynâhum fehum lâ yubsirûn.

Anlamı: Biz onların önlerine bir set, arkalarına da bir set çektik ve gözlerini perdeledik. Artık görmezler.

10. Ayet

Okunuşu: Ve sevâun aleyhim eenzertehum em lem tunzirhum lâ yu'minûn.

Anlamı: Onları uyarsan da, uyarmasan da onlar için birdir, inanmazlar.

11. Ayet

Okunuşu: İnnemâ tunziru menittebeaz-zikra ve haşiyer-rahmâne bil-gayb, febeşşirhu bimağfiretin ve ecrin kerîm.

Anlamı: Sen ancak Zikr'e (Kur'an'a) uyanı ve görmediği hâlde Rahmân'dan korkan kimseyi uyarırsın. İşte onu bir bağışlanma ve güzel bir mükâfatla müjdele.

12. Ayet

Okunuşu: İnnâ nahnu nuhyil-mevtâ ve nektubu mâ kaddemû ve âsârahum, ve kulle şey'in ahsaynâhu fî imâmin mubîn.

Anlamı: Şüphesiz ölüleri ancak biz diriltiriz. Onların yaptıklarını ve bıraktıkları eserleri yazarız. Biz her şeyi apaçık bir kitapta (Levh-i Mahfuz'da) bir bir kaydetmişizdir.

2. Bölüm (13 - 27. Ayetler)

13. Ayet

Okunuşu: Vadrib lehum meselen ashâbel-karyeh. İz câehel-murselûn.

Anlamı: Onlara, şu şehir halkını misal getir: Hani onlara elçiler gelmişti.

14. Ayet

Okunuşu: İz erselnâ ileyhimusneyni fekezzebûhumâ feazzeznâ bisâlisin fekâlû innâ ileykum murselûn.

Anlamı: İşte o zaman biz, onlara iki elçi göndermiştik. Onları yalanladılar. Bunun üzerine üçüncü bir elçi göndererek (onları) destekledik. Onlar, "Biz size gönderilmiş elçileriz!" dediler.

15. Ayet

Okunuşu: Kâlû mâ entum illâ beşerun mislunâ ve mâ enzeler-rahmânu min şey'in in entum illâ tekzibûn.

Anlamı: Elçilere dediler ki: "Siz de ancak bizim gibi birer insansınız. Rahmân, herhangi bir şey indirmiş değildir. Siz ancak yalan söylüyorsunuz."

16. Ayet

Okunuşu: Kâlû rabbunâ ya'lemu innâ ileykum lemurselûn.

Anlamı: (Elçiler) dediler ki: "Rabbimiz biliyor; biz gerçekten size gönderilmiş elçileriz."

17. Ayet

Okunuşu: Ve mâ aleynâ illel-belâgul-mubîn.

Anlamı: "Bize düşen ancak apaçık bir tebliğdir."

18. Ayet

Okunuşu: Kâlû innâ tetayyernâ bikum, lein lem tentehû lenercumennekum ve leyemessennekum minnâ azâbun elîm.

Anlamı: Dediler ki: "Şüphesiz biz sizin yüzünüzden uğursuzluğa uğradık. Eğer vazgeçmezseniz, sizi mutlaka taşlarız ve bizim tarafımızdan size elem dolu bir azap dokunur."

19. Ayet

Okunuşu: Kâlû tâirukum meakum, ein zukkirtum, bel entum kavmun musrifûn.

Anlamı: Elçiler de, "Uğursuzluğunuz kendinizdendir. Size öğüt verildiği için mi (uğursuzluğa uğruyorsunuz?). Hayır, siz aşırı giden bir kavimsiniz" dediler.

20. Ayet

Okunuşu: Ve câe min aksal-medîneti raculun yes'â kâle yâ kavmittebiul-murselîn.

Anlamı: Şehrin öbür ucundan bir adam koşarak geldi. "Ey kavmim! Bu elçilere uyun" dedi.

21. Ayet

Okunuşu: İttebiû men lâ yes'elukum ecran ve hum muhtedûn.

Anlamı: "Sizden hiçbir ücret istemeyen kimselere uyun, onlar hidayete erdirilmiş kimselerdir."

22. Ayet

Okunuşu: Ve mâ liye lâ a'budullezî fetaranî ve ileyhi turceûn.

Anlamı: "Hem ben, ne diye beni yaratana kulluk etmeyeyim. Oysa siz de yalnızca O’na döndürüleceksiniz."

23. Ayet

Okunuşu: Eettehizu min dûnihî âliheten in yuridnir-rahmânu bidurrin lâ tugni annî şefâatuhum şey'en ve lâ yunkizûn.

Anlamı: "O’nu bırakıp da başka ilâhlar mı edineyim? Eğer Rahmân bana bir zarar vermek istese, onların şefaati bana hiçbir fayda sağlamaz ve beni kurtaramazlar."

24. Ayet

Okunuşu: İnnî izen lefî dalâlin mubîn.

Anlamı: "O takdirde ben mutlaka açık bir sapıklık içinde olurum."

25. Ayet

Okunuşu: İnnî âmentu birabbikum fesmeûn.

Anlamı: "Şüphesiz ben Rabbinize inandım. Gelin, beni dinleyin!"

26. Ayet

Okunuşu: Kîledhulil-cennete, kâle yâ leyte kavmî ya'lemûn.

Anlamı: (Kavmi onu öldürdüğünde kendisine): "Cennete gir!" denildi. O da, "Keşke kavmim, Rabbimin beni bağışladığını ve beni ikram edilenlerden kıldığını bilseydi!" dedi.

27. Ayet

Okunuşu: Bimâ gafera lî rabbî ve cealenî minel-mukramîn.

Anlamı: (Anlamı 26. ayetin içinde verilmiştir: Rabbimin beni bağışladığını ve beni ikram edilenlerden kıldığını bilseydi!)

3. Bölüm (28 - 40. Ayetler)

28. Ayet

Okunuşu: Ve mâ enzelnâ alâ kavmihî min ba'dihî min cundin mines-semâi ve mâ kunnâ munzilîn.

Anlamı: Kendisinden sonra kavmi üzerine (onları cezalandırmak için) gökten hiçbir ordu indirmedik. İndirecek de değildik.

29. Ayet

Okunuşu: İn kânet illâ sayhaten vâhideten feizâ hum hâmidûn.

Anlamı: Sadece korkunç bir ses oldu. Bir de baktılar ki sönüp gitmişler.

30. Ayet

Okunuşu: Yâ hasraten alel-ibâd, mâ ye'tîhim min resûlin illâ kânû bihî yestehziûn.

Anlamı: Yazık o kullara! Kendilerine bir peygamber gelmezdi ki, onunla alay etmesinler.

31. Ayet

Okunuşu: Elem yerav kem ehleknâ kablehum minel-kurûni ennehum ileyhim lâ yerciûn.

Anlamı: Kendilerinden önce nice nesilleri helâk ettiğimizi; onların artık kendilerine dönmeyeceklerini görmediler mi?

32. Ayet

Okunuşu: Ve in kullun lemmâ cemîun ledeynâ muhdarûn.

Anlamı: Onların hepsi de mutlaka toplanıp (hesap için) huzurumuza çıkarılacaklardır.

33. Ayet

Okunuşu: Ve âyetun lehumul-ardul-meytetu, ahyeynâhâ ve ahracnâ minhâ habben feminhu ye'kulûn.

Anlamı: Ölü toprak onlar için bir delildir. Biz onu dirilttik ve ondan taneler çıkardık da onlardan yiyorlar.

34. Ayet

Okunuşu: Ve cealnâ fîhâ cennâtin min nahîlin ve a'nâbin ve feccernâ fîhâ minel-uyûn.

Anlamı: Orada hurma bahçeleri ve üzüm bağları yaptık ve içlerinden pınarlar fışkırttık.

35. Ayet

Okunuşu: Liye'kulû min semerihî ve mâ amilethu eydîhim, efelâ yeşkurûn.

Anlamı: Ürününden ve kendi elleriyle yaptıklarından yesinler diye. Hâlâ şükretmeyecekler mi?

36. Ayet

Okunuşu: Subhânellezî halakal-ezvâce kullehâ mimmâ tunbitul-ardu ve min enfusihim ve mimmâ lâ ya'lemûn.

Anlamı: Yerin bitirdiği şeylerden, insanların kendilerinden ve (daha) bilemedikleri şeylerden bütün çiftleri yaratanın şanı yücedir.

37. Ayet

Okunuşu: Ve âyetun lehumul-leylu neslehu minhun-nehâra feizâ hum muzlimûn.

Anlamı: Gece de onlar için bir delildir. Gündüzü ondan çekip alırız, bir de bakarsın karanlıkta kalmışlardır.

38. Ayet

Okunuşu: Veş-şemsu tecrî limustekarrin lehâ, zâlike takdîrul-azîzil-alîm.

Anlamı: Güneş de kendi yörüngesinde akıp gitmektedir. Bu, mutlak güç sahibi, hakkıyla bilen Allah’ın takdiridir.

39. Ayet

Okunuşu: Vel-kamera kaddernâhu menâzile hattâ âde kel-urcûnil-kadîm.

Anlamı: Ayın dolaşımı için de konak yerleri belirledik. Nihayet o, eğrilmiş kuru hurma dalı gibi olur.

40. Ayet

Okunuşu: Leş-şemsu yenbegî lehâ en tudrikel-kamera ve lel-leylu sâbikun-nehâr, ve kullun fî felekin yesbehûn.

Anlamı: Ne güneş aya yetişebilir, ne de gece gündüzü geçebilir. Her biri bir yörüngede yüzmektedir.

4. Bölüm (41 - 54. Ayetler)

41. Ayet

Okunuşu: Ve âyetun lehum ennâ hamelnâ zurriyyetehum fil-fulkil-meşhûn.

Anlamı: Onların soylarını dolu gemide taşımamız da onlar için bir delildir.

42. Ayet

Okunuşu: Ve halaknâ lehum min mislihî mâ yerkebûn.

Anlamı: Biz onlar için o gemi gibi binecekleri nice şeyler yarattık.

43. Ayet

Okunuşu: Ve in neşe' nugrikhum felâ sarîha lehum ve lâ hum yunkazûn.

Anlamı: Biz istesek onları suda boğarız da kendileri için ne imdat çağrısı yapan olur, ne de kurtarılırlar.

44. Ayet

Okunuşu: İllâ rahmeten minnâ ve metâan ilâ hîn.

Anlamı: Ancak tarafımızdan bir rahmet olarak ve bir süreye kadar daha yaşasınlar diye kurtarılırlar.

45. Ayet

Okunuşu: Ve izâ kîle lehumuttekû mâ beyne eydîkum ve mâ halfekum leallekum turhamûn.

Anlamı: Onlara, "Önünüzde ve arkanızda olan şeylerden (dünya ve ahiret azabından) sakının ki size merhamet edilsin" denildiğinde yüz çevirirler.

46. Ayet

Okunuşu: Ve mâ te'tîhim min âyetin min âyâti rabbihim illâ kânû anhâ mu'ridîn.

Anlamı: Onlara Rablerinin âyetlerinden bir âyet gelmez ki ondan yüz çeviriyor olmasınlar.

47. Ayet

Okunuşu: Ve izâ kîle lehum enfikû mimmâ razakakumullâhu kâlellezîne keferû lillezîne âmenû enut'imu men lev yeşâullâhu at'amehu, in entum illâ fî dalâlin mubîn.

Anlamı: Onlara, "Allah’ın sizi rızıklandırdığı şeylerden Allah yolunda harcayın" denildiği zaman, inkâr edenler iman edenlere, "Allah’ın, dileseydi doyuracağı kimseleri biz mi doyuralım? Siz gerçekten apaçık bir sapıklık içindesiniz" derler.

48. Ayet

Okunuşu: Ve yekûlûne metâ hâzel-va'du in kuntum sâdikîn.

Anlamı: "Eğer doğru söyleyenlerseniz, bu tehdit ne zaman gerçekleşecek?" diyorlar.

49. Ayet

Okunuşu: Mâ yenzurûne illâ sayhaten vâhideten te'huzuhum ve hum yehissimûn.

Anlamı: Onlar, birbirleriyle çekişip dururken kendilerini yakalayacak korkunç bir sesten başka bir şey beklemiyorlar.

50. Ayet

Okunuşu: Felâ yestetîûne tavsiyeten ve lâ ilâ ehlihim yerciûn.

Anlamı: İşte o anda onlar ne bir vasiyette bulunabilirler, ne de ailelerine dönebilirler.

51. Ayet

Okunuşu: Ve nufiha fis-sûri feizâ hum minel-ecdâsi ilâ rabbihim yensilûn.

Anlamı: Sûra üfürülür. Bir de bakarsın, kabirlerden çıkmış Rablerine koşuyorlar.

52. Ayet

Okunuşu: Kâlû yâ veylenâ men beasenâ min merkadinenâ, hâzâ mâ va'ader-rahmânu ve sadekal-murselûn.

Anlamı: "Vay halimize! Bizi uykumuzdan kim kaldırdı? Bu, Rahmân’ın vaad ettiği şeydir. Peygamberler doğru söylemişler" derler.

53. Ayet

Okunuşu: İn kânet illâ sayhaten vâhideten feizâ hum cemîun ledeynâ muhdarûn.

Anlamı: Sadece korkunç bir ses olur. Bir de bakarsın hepsi toplanmış huzurumuzda hazır bulunuyorlar.

54. Ayet

Okunuşu: Fel-yevme lâ tuzlemu nefsun şey'en ve lâ tuczevne illâ mâ kuntum ta'melûn.

Anlamı: O gün kimseye, hiçbir haksızlık yapılmaz. Siz ancak işlediklerinizin karşılığını görürsünüz.

5. Bölüm (55 - 70. Ayetler)

55. Ayet

Okunuşu: İnne ashâbel-cennetil-yevme fî şugulin fâkihûn.

Anlamı: Şüphesiz cennettekiler o gün nimetlerle meşguldürler, zevk sürerler.

56. Ayet

Okunuşu: Hum ve ezvâcuhum fî zilâlin alel-erâiki muttekiûn.

Anlamı: Onlar ve eşleri gölgelerde, koltuklara yaslanmışlardır.

57. Ayet

Okunuşu: Lehum fîhâ fâkihetun ve lehum mâ yeddaûn.

Anlamı: Orada onlar için her çeşit meyve vardır. Bütün istekleri yerine getirilir.

58. Ayet

Okunuşu: Selâmun kavlen min rabbin rahîm.

Anlamı: Onlara, çok merhametli olan Rab’den bir söz olarak "Selâm" vardır.

59. Ayet

Okunuşu: Vemtâzul-yevme eyyuhel-mucrimûn.

Anlamı: (Allah şöyle der:) "Ey suçlular! Ayrılın bu gün!"

60. Ayet

Okunuşu: Elem a'hed ileykum yâ benî âdeme en lâ ta'buduş-şeytâne, innehu lekum aduvvun mubîn.

Anlamı: "Ey Âdemoğulları! Ben size, şeytana kulluk etmeyin. Çünkü o sizin için apaçık bir düşmandır, diye emretmedim mi?"

61. Ayet

Okunuşu: Ve eni'budûnî, hâzâ sırâtun mustekîm.

Anlamı: "Ve bana kulluk edin. İşte bu dosdoğru yoldur, diye emretmedim mi?"

62. Ayet

Okunuşu: Ve lekad edalle minkum cibillen kesîran, efelem tekûnû ta'kilûn.

Anlamı: "Andolsun, o sizden pek çok nesli saptırdı. Hiç düşünmüyor muydunuz?"

63. Ayet

Okunuşu: Hâzihî cehennemulletî kuntum tûadûn.

Anlamı: "İşte bu, tehdit edildiğiniz cehennemdir."

64. Ayet

Okunuşu: İslevhel-yevme bimâ kuntum tekfurûn.

Anlamı: "İnkâr ettiğinizden dolayı bugün girin oraya!"

65. Ayet

Okunuşu: El-yevme nahtimu alâ efvâhihim ve tukellimunâ eydîhim ve teşhedu erculuhum bimâ kânû yeksibûn.

Anlamı: O gün biz onların ağızlarını mühürleriz. Elleri bize konuşur, ayakları da kazandıklarına şahitlik eder.

66. Ayet

Okunuşu: Ve lev neşâu letamesnâ alâ a'yunihim festebekus-sırâta feennâ yubsirûn.

Anlamı: Eğer dileseydik, gözlerini silme kör ederdik de (bu halde) yolu bulmaya çalışırlardı. Fakat nasıl göreceklerdi?

67. Ayet

Okunuşu: Ve lev neşâu lemesahnâhum alâ mekânetihim femestetâû mudiyyen ve lâ yerciûn.

Anlamı: Yine dileseydik, oldukları yerde kılıklarını değiştirirdik de ne ileri gidebilirlerdi, ne de geri dönebilirlerdi.

68. Ayet

Okunuşu: Ve men nuammirhu nunekkishu fil-halkı, efelâ ya'kilûn.

Anlamı: Kime uzun ömür verirsek, biz onun yaratılışını tersine çeviririz. Hiç düşünmüyorlar mı?

69. Ayet

Okunuşu: Ve mâ allemnâhuş-şi'ra ve mâ yenbegî lehu, in huve illâ zikrun ve Kur'ânun mubîn.

Anlamı: Biz o Peygamber’e şiir öğretmedik. Bu ona yaraşmaz da. O’na vahyedilen ancak bir öğüt ve apaçık bir Kur'an’dır.

70. Ayet

Okunuşu: Liyunzira men kâne hayyen ve yehikkal-kavlu alel-kâfirîn.

Anlamı: (Aklen ve fikren) diri olanları uyarması ve kâfirler hakkındaki o sözün (azabın) gerçekleşmesi için (Kur'an’ı indirdik).

6. Bölüm (71 - 83. Ayetler)

71. Ayet

Okunuşu: Evelem yerav ennâ halaknâ lehum mimmâ amilet eydînâ en'âmen fehum lehâ mâlikûn.

Anlamı: Görmediler mi ki, biz onlar için, ellerimizin eseri olan hayvanlar yarattık da onlar bu hayvanlara sahip oluyorlar?

72. Ayet

Okunuşu: Ve zellelnâhâ lehum feminhâ rakûbuhum ve minhâ ye'kulûn.

Anlamı: Biz o hayvanları kendilerine boyun eğdirdik. Onlardan bir kısmı binekleridir, bir kısmını da yerler.

73. Ayet

Okunuşu: Ve lehum fîhâ menâfiu ve meşâribu, efelâ yeşkurûn.

Anlamı: Onlar için bu hayvanlarda yararlar ve içecekler vardır. Hâlâ şükretmeyecekler mi?

74. Ayet

Okunuşu: Vettehazû min dûnillâhi âliheten leallehum yunsarûn.

Anlamı: Belki kendilerine yardım edilir diye Allah’ı bırakıp da başka ilâhlar edindiler.

75. Ayet

Okunuşu: Lâ yestetîûne nasrahum ve hum lehum cundun muhdarûn.

Anlamı: Onların ilâhları kendilerine yardım edemezler. Onlar ise ilâhlarını korumak için hazır kıtadırlar.

76. Ayet

Okunuşu: Felâ yahzunke kavluhum, innâ na'lemu mâ yusirrûne ve mâ yu'linûn.

Anlamı: (Ey Muhammed!) Artık onların sözü seni üzmesin. Çünkü biz onların gizlediklerini de açığa vurduklarını da biliyoruz.

77. Ayet

Okunuşu: Evelem yeral-insânu ennâ halaknâhu min nutfetin feizâ huve hasîmun mubîn.

Anlamı: İnsan görmedi mi ki, biz onu bir nutfeden yarattık. Bir de bakarsın ki, apaçık bir düşman kesilmiş.

78. Ayet

Okunuşu: Ve darabe lenâ meselen ve nesiye halkahu, kâle men yuhyil-izâme ve hiye ramîm.

Anlamı: Kendi yaratılışını unutarak bize bir örnek getirdi: "Çürümüş kemikleri kim diriltecek?" dedi.

79. Ayet

Okunuşu: Kul yuhyîhellezî enşeehâ evvele merratin, ve huve bikulli halkın alîm.

Anlamı: De ki: "Onları ilk defa var eden diriltecektir. O, her yaratılmışı hakkıyla bilendir."

80. Ayet

Okunuşu: Ellezî ceale lekum mineş-şeceril-ahdari nâran feizâ entum minhu tûkidûn.

Anlamı: O, sizin için yeşil ağaçtan ateş yaratandır. Şimdi siz ondan yakıp duruyorsunuz.

81. Ayet

Okunuşu: Eveleysellezî halakas-semâvâti vel-arda bikâdirin alâ en yahluka mislehum? Belâ ve huvel-hallâkul-alîm.

Anlamı: Gökleri ve yeri yaratan Allah’ın, onların benzerini yaratmaya gücü yetmez mi? Elbette yeter. O, hakkıyla yaratandır, hakkıyla bilendir.

82. Ayet

Okunuşu: İnnemâ emruhû izâ erâde şey'en en yekûle lehu kun fe yekûn.

Anlamı: Bir şeyi dilediğinde O’nun emri o şeye yalnızca "Ol!" demektir. O da hemen oluverir.

83. Ayet

Okunuşu: Fesubhânellezî biyedihî melekûtu kulli şey'in ve ileyhi turceûn.

Anlamı: Her şeyin hükümranlığı elinde olan Allah’ın şanı yücedir! Siz yalnız O’na döndürüleceksiniz.`;

const YASIN_LINES = YASIN_TEXT.split('\n').map((line) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return { type: 'divider', text: '' };
  }
  if (/^\d+\. Ayet/.test(trimmed)) {
    return { type: 'label', text: trimmed };
  }
  if (trimmed.includes('Bölüm') || trimmed.startsWith('Yasin Suresi')) {
    return { type: 'heading', text: trimmed };
  }
  if (trimmed.startsWith('Okunuşu:')) {
    return { type: 'arabic', text: trimmed.replace('Okunuşu: ', '') };
  }
  if (trimmed.startsWith('Anlamı:')) {
    return { type: 'meaning', text: trimmed.replace('Anlamı: ', '') };
  }
  return { type: 'plain', text: trimmed };
});

const NOTIFICATION_PREF_KEY = 'notificationsEnabled';
const ZIKR_PREF_KEY = 'zikrProgress';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Bildirim Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: 'max',
  }),
});

export default function App() {
  // --- STATE TANIMLARI ---
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Konum belirleniyor...');
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [currentPrayer, setCurrentPrayer] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Yükleme ve Hata Durumları
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);
  
  // Ses State
  const [sound, setSound] = useState(null);
  const [playingSound, setPlayingSound] = useState(null);
  
  // Kıble State
  const [qiblaAngle, setQiblaAngle] = useState(null);
  const [deviceHeading, setDeviceHeading] = useState(0);

  // Namaz Bilgileri Modal State
  const [guideModalVisible, setGuideModalVisible] = useState(false);
  const [guideContent, setGuideContent] = useState(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsPrefLoaded, setNotificationsPrefLoaded] = useState(false);
  const [zikrProgress, setZikrProgress] = useState({});
  const [zikrLoaded, setZikrLoaded] = useState(false);
  const [yasinModalVisible, setYasinModalVisible] = useState(false);

  // Animasyon Refleri
  const splashFadeAnim = useRef(new Animated.Value(1)).current;
  const splashScaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const arrowPulseAnim = useRef(new Animated.Value(1)).current;

  const getAngleDiff = (target, current) => {
    if (target === null || current === null || Number.isNaN(target) || Number.isNaN(current)) {
      return null;
    }
    let diff = target - current;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    return diff;
  };

  // --- EFFECT: BAŞLANGIÇ AYARLARI ---
  useEffect(() => {
    setupApp();
    
    // Splash Animasyonu
    Animated.parallel([
      Animated.timing(splashScaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoRotateAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(logoRotateAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // SAFETY TIMEOUT: 3 saniye sonra Splash'i zorla kapat (konum gelmese bile)
    const safetyTimer = setTimeout(() => {
        closeSplash();
    }, 3000);

    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    const loadNotificationPreference = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(NOTIFICATION_PREF_KEY);
        if (storedValue !== null) {
          setNotificationsEnabled(storedValue === 'true');
        }
      } catch (error) {
        console.log('Bildirim tercihi okunamadı', error);
      } finally {
        setNotificationsPrefLoaded(true);
      }
    };
    loadNotificationPreference();
  }, []);

  useEffect(() => {
    const loadZikrProgress = async () => {
      try {
        const stored = await AsyncStorage.getItem(ZIKR_PREF_KEY);
        if (stored) {
          setZikrProgress(JSON.parse(stored));
        }
      } catch (error) {
        console.log('Zikir progresi okunamadı', error);
      } finally {
        setZikrLoaded(true);
      }
    };
    loadZikrProgress();
  }, []);

  useEffect(() => {
    if (!zikrLoaded) return;
    const now = new Date();
    const currentDay = now.toDateString();
    const currentWeek = `${now.getFullYear()}-W${Math.ceil(
      ((now - new Date(now.getFullYear(), 0, 1)) / DAY_IN_MS + now.getDay() + 1) / 7
    )}`;

    setZikrProgress((prev) => {
      const updated = { ...prev };
      ZIKR_GOALS.forEach((goal) => {
        const key = `${goal.key}Meta`;
        const meta = prev[key] || {};
        if (goal.period === 'Günlük' && meta.lastReset !== currentDay) {
          updated[goal.key] = 0;
          updated[key] = { ...meta, lastReset: currentDay };
        }
        if (goal.period === 'Haftalık' && meta.lastReset !== currentWeek) {
          updated[goal.key] = 0;
          updated[key] = { ...meta, lastReset: currentWeek };
        }
      });
      AsyncStorage.setItem(ZIKR_PREF_KEY, JSON.stringify(updated)).catch((error) =>
        console.log('Zikir reset kaydedilemedi', error)
      );
      return updated;
    });
  }, [zikrLoaded]);

  const setupApp = async () => {
    // 1. Bildirim İzni
    await requestNotificationPermissions();
    
    // 2. Kanal Kurulumu (Android)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('ezan-channel', {
        name: 'Ezan Vakti Bildirimleri',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'ogle.mp3', // app.json sound ile eşleşmeli
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      });
      await Notifications.setNotificationChannelAsync('reminder-channel', {
        name: 'Vakit Hatırlatıcıları',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null,
        vibrationPattern: [0, 150],
        enableVibrate: true,
      });
    }

    // 3. Konumu Al
    getLocation();
  };

  const closeSplash = () => {
      Animated.timing(splashFadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
  };

  // --- LOCATION & PRAYER TIMES ---
  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Konum izni reddedildi.');
        setLoading(false);
        return;
      }

      let locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation(locationData);
      resolveLocationLabel(locationData.coords);
      
      // Hesaplamaları yap
      const coords = new Coordinates(locationData.coords.latitude, locationData.coords.longitude);
      
      // 1. Namaz Vakitleri
      const params = CalculationMethod.Turkey();
      const date = new Date();
      const times = new PrayerTimes(coords, date, params);
      setPrayerTimes(times);

      // 2. Kıble Açısı
      const qibla = Qibla(coords);
      setQiblaAngle(qibla);

      // 3. Pusula Başlat
      startHeadingWatch();

      setLoading(false);

    } catch (err) {
      console.log(err);
      setError('Konum alınamadı.');
      setLoading(false);
    }
  };

  const resolveLocationLabel = async (coords) => {
    try {
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      if (place) {
        const district = place.district || place.subregion || place.city;
        const city = place.city || place.region || place.country;
        const formatted = [district, city].filter(Boolean).join(', ');
        setLocationLabel(formatted || 'Konum bulundu');
      } else {
        setLocationLabel('Konum bulunamadı');
      }
    } catch (error) {
      console.log('Konum etiketi alınamadı', error);
      setLocationLabel('Konum bulunamadı');
    }
  };

  const startHeadingWatch = async () => {
    try {
        await Location.watchHeadingAsync((obj) => {
            let heading = obj.trueHeading !== -1 ? obj.trueHeading : obj.magHeading;
            setDeviceHeading(heading);
        });
    } catch (e) {
        console.log(e);
    }
  };

  // --- TIMERS ---
  useEffect(() => {
    if (prayerTimes) {
      updateCurrentAndNextPrayer();
      const interval = setInterval(updateCurrentAndNextPrayer, 1000);
      return () => clearInterval(interval);
    }
  }, [prayerTimes]);

  useEffect(() => {
      if (!notificationsPrefLoaded) return;
      if (!notificationsEnabled) return;
      if (prayerTimes && location) {
          schedulePrayerNotifications();
      }
  }, [prayerTimes, location, notificationsEnabled, notificationsPrefLoaded]);


  const updateCurrentAndNextPrayer = () => {
    if (!prayerTimes) return;
    const now = new Date();
    
    // Basit bir döngü ile vakit bulma
    const times = [
        { key: 'fajr', time: prayerTimes.fajr },
        { key: 'sunrise', time: prayerTimes.sunrise },
        { key: 'dhuhr', time: prayerTimes.dhuhr },
        { key: 'asr', time: prayerTimes.asr },
        { key: 'maghrib', time: prayerTimes.maghrib },
        { key: 'isha', time: prayerTimes.isha },
    ].filter(item => item.time);

    let current = times[times.length - 1] || null;
    let next = null;

    for (let i = 0; i < times.length; i++) {
        if (now < times[i].time) {
            next = times[i];
            current = times[i - 1] || current;
            break;
        }
    }

    if (!next) {
        // Gün bitmiş, sonraki İmsak (Yarın)
        next = times[0]; 
        current = times[times.length - 1] || null;
    }

    setCurrentPrayer(current ? { name: current.key, time: current.time } : null);
    setNextPrayer(next ? { name: next.key, time: next.time } : null);

    // Countdown
    if (next) {
      let diff = next.time - now;
      if (diff < 0) {
        diff += 24 * 60 * 60 * 1000;
      }
      if (diff >= 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds });
      } else {
        setTimeRemaining(null);
      }
    } else {
      setTimeRemaining(null);
    }
  };

  const updateZikrProgress = (goalKey, delta) => {
    const goal = ZIKR_GOALS.find((item) => item.key === goalKey);
    if (!goal) return;
    setZikrProgress((prev) => {
      const current = prev[goalKey] ?? 0;
      const next = Math.min(Math.max(current + delta, 0), goal.target);
      const metaKey = `${goalKey}Meta`;
      const meta = prev[metaKey] || {};
      const updated = { ...prev, [goalKey]: next, [metaKey]: meta };
      AsyncStorage.setItem(ZIKR_PREF_KEY, JSON.stringify(updated)).catch((error) =>
        console.log('Zikir progresi kaydedilemedi', error)
      );
      return updated;
    });
  };

  // --- AUDIO ---
  const handlePrayerSoundPress = async (prayerKey) => {
    if (prayerKey === 'sunrise') {
        Alert.alert("Bilgi", "Kerahat vaktinde ezan okunmaz.");
        return;
    }

    // Zaten çalıyorsa durdur
    if (playingSound === prayerKey) {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
            setPlayingSound(null);
        }
        return;
    }

    // Başka ses varsa durdur
    if (sound) {
        try {
            await sound.stopAsync();
            await sound.unloadAsync();
        } catch (e) {}
    }

    // Yeni çal
    try {
        const file = SOUND_FILES[prayerKey];
        if (!file) return;

        const { sound: newSound } = await Audio.Sound.createAsync(file);
        setSound(newSound);
        setPlayingSound(prayerKey);
        
        newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
                setPlayingSound(null);
                newSound.unloadAsync();
            }
        });

        await newSound.playAsync();

    } catch (error) {
        Alert.alert("Hata", "Ses dosyası çalınamadı.");
    }
  };

  const openPrayerGuide = (key) => {
    const info = PRAYER_DETAILS[key];
    if (!info) return;
    setGuideContent({ key, ...info });
    setGuideModalVisible(true);
  };

  const triggerTestEzanNotification = async () => {
    if (!notificationsEnabled) {
      Alert.alert('Bilgi', 'Test için önce bildirimleri açmanız gerekir.');
      return;
    }
    try {
      const triggerDate = new Date(Date.now() + 5000);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Bildirimi',
          body: 'Ezan sesi testi başlatılıyor.',
          sound: 'ogle.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          ...(Platform.OS === 'android' ? { channelId: 'ezan-channel' } : {}),
        },
      });
      Alert.alert('Bilgi', '5 saniye içinde test bildirimi gelecek.');
    } catch (error) {
      console.log('Test bildirimi hatası', error);
      Alert.alert('Hata', 'Test bildirimi planlanamadı.');
    }
  };

  const handleNotificationsToggle = async (value) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREF_KEY, value ? 'true' : 'false');
    } catch (error) {
      console.log('Bildirim tercihi kaydedilemedi', error);
    }

    if (value) {
      await schedulePrayerNotifications(true);
      Alert.alert('Bilgi', 'Bildirimler tekrar açıldı.');
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      Alert.alert('Bilgi', 'Ezan bildirimleri kapatıldı.');
    }
  };

  // --- NOTIFICATIONS ---
  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  };

  const schedulePrayerNotifications = async (forceEnabledValue = null) => {
    const isEnabled = forceEnabledValue ?? notificationsEnabled;
    if (!prayerTimes || !isEnabled) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const buildDateTrigger = (date, channelId = 'ezan-channel') => ({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android' ? { channelId } : {}),
    });

    // Güneş vaktini (sunrise) ana ezan bildirimlerinden hariç tutuyoruz.
    const entries = [
      { key: 'fajr',    time: prayerTimes.fajr },
      { key: 'dhuhr',   time: prayerTimes.dhuhr },
      { key: 'asr',     time: prayerTimes.asr },
      { key: 'maghrib', time: prayerTimes.maghrib },
      { key: 'isha',    time: prayerTimes.isha },
    ];

    for (const { key, time } of entries) {
      if (!time) continue;

      // 1) Vakit girdiği anda EZAN sesli bildirim
      if (time > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${PRAYER_NAMES[key]} vakti`,
            body: `${PRAYER_NAMES[key]} vakti girdi.`,
            sound: 'ogle.mp3',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: buildDateTrigger(time, 'ezan-channel'),
        });
      }

      // 2) Her vakitten 10 dk önce ek sessiz hatırlatma (sadece bildirim, ezan sesi yok)
      const tenMinutesBefore = new Date(time.getTime() - 10 * 60 * 1000);
      if (tenMinutesBefore > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${PRAYER_NAMES[key]} vaktine 10 dakika kaldı`,
            body: `${PRAYER_NAMES[key]} için hazırlanın.`,
            sound: null,
            priority: Notifications.AndroidNotificationPriority.DEFAULT,
          },
          trigger: buildDateTrigger(tenMinutesBefore, 'reminder-channel'),
        });
      }
    }
  };

  // --- QIBLA ANIMATION ---
  useEffect(() => {
    if (qiblaAngle !== null && deviceHeading !== null) {
      const diff = getAngleDiff(qiblaAngle, deviceHeading);

      Animated.spring(rotateAnim, {
        toValue: diff ?? 0,
        friction: 7,
        useNativeDriver: true
      }).start();

      if (diff !== null && Math.abs(diff) < 10) {
        const pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(arrowPulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
            Animated.timing(arrowPulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
          ])
        );
        pulseAnimation.start();
        return () => pulseAnimation.stop();
      }

      arrowPulseAnim.setValue(1);
    }
  }, [deviceHeading, qiblaAngle]);


  // --- RENDER HELPERS ---
  const formatTime = (date) => date ? format(date, 'HH:mm', { locale: tr }) : '--:--';
  const formatDate = (date) => format(date, 'd MMMM yyyy, EEEE', { locale: tr });
  const formatReligiousDate = (dateString) => format(new Date(dateString), 'd MMMM, EEEE', { locale: tr });

  const qiblaAngleDiff = qiblaAngle !== null ? getAngleDiff(qiblaAngle, deviceHeading ?? 0) : null;
  const qiblaDiffAbs = qiblaAngleDiff !== null ? Math.abs(qiblaAngleDiff) : null;
  const isQiblaAligned = qiblaDiffAbs !== null && qiblaDiffAbs <= 5;
  const qiblaDirectionText = qiblaAngleDiff !== null ? (qiblaAngleDiff > 0 ? 'Sağa çevir' : 'Sola çevir') : '';
  const qiblaAngleDisplay = qiblaAngle !== null ? `${Math.round(qiblaAngle)}°` : '--°';
  const deviceHeadingDisplay = deviceHeading !== null ? `${Math.round(deviceHeading)}°` : '--°';
  const qiblaDiffDisplay = qiblaDiffAbs !== null ? `${qiblaDiffAbs.toFixed(0)}°` : '--°';
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingReligiousDay = RELIGIOUS_DAYS.find((day) => new Date(day.date) >= todayStart);
  const focusReflection = useMemo(() => {
    const index = new Date().getDate() % FOCUS_REFLECTIONS.length;
    return FOCUS_REFLECTIONS[index];
  }, []);
  const prayerProgress = useMemo(() => {
    if (!currentPrayer?.time || !nextPrayer?.time) return 0;
    const nowTs = Date.now();
    let adjustedStart = currentPrayer.time.getTime();
    let adjustedEnd = nextPrayer.time.getTime();

    if (adjustedStart > nowTs) {
      adjustedStart -= DAY_IN_MS;
    }
    if (adjustedEnd <= adjustedStart) {
      adjustedEnd += DAY_IN_MS;
    }

    const total = adjustedEnd - adjustedStart;
    if (total <= 0) return 0;

    const elapsed = nowTs - adjustedStart;
    return Math.min(Math.max(elapsed / total, 0), 1);
  }, [currentPrayer, nextPrayer, timeRemaining]);
  const prayerProgressDisplay = `${Math.round(prayerProgress * 100)}%`;
  const directionMessage = isQiblaAligned
    ? 'Kıbleye hizalandınız'
    : qiblaDirectionText
      ? (qiblaDirectionText === 'Sağa çevir' ? 'Biraz sağa çevirin' : 'Biraz sola çevirin')
      : 'Veri bekleniyor';

  const cardinalPoints = [
    { label: 'K', style: styles.cardinalNorth },
    { label: 'D', style: styles.cardinalEast },
    { label: 'G', style: styles.cardinalSouth },
    { label: 'B', style: styles.cardinalWest },
  ];


  // --- SPLASH SCREEN RENDER ---
  if (showSplash) {
      const spin = logoRotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg']
      });
      return (
          <View style={styles.splashContainer}>
              <Animated.View style={[styles.splashContent, { opacity: splashFadeAnim, transform: [{ scale: splashScaleAnim }] }]}>
                  <Animated.Image 
                    source={require('./assets/logo.png')} 
                    style={[styles.splashLogo, { transform: [{ rotate: spin }] }]} 
                    resizeMode="contain"
                  />
                  <Text style={styles.splashText}>Vakit</Text>
                  <View style={styles.splashQuoteCard}>
                    <Text style={styles.splashQuote}>
                      “Namaz, müminlere vakitli olarak farz kılınmıştır.”
                    </Text>
                    <Text style={styles.splashQuoteRef}>(Nisa, 103)</Text>
                  </View>
              </Animated.View>
          </View>
      );
  }

  // --- MAIN RENDER ---
  return (
    <LinearGradient colors={HERO_GRADIENT} style={styles.gradientBackground}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroChip}>Konum</Text>
              <Text style={styles.heroLocation}>{locationLabel}</Text>
              <Text style={styles.heroDate}>{formatDate(new Date())}</Text>
            </View>
            <Image source={require('./assets/logo.png')} style={styles.heroLogo} />
          </View>

          <View style={styles.heroCountdownRow}>
            <View>
              <Text style={styles.heroCountdownLabel}>Sonraki Vakit</Text>
              <Text style={styles.heroCountdownPrayer}>
                {nextPrayer ? PRAYER_NAMES[nextPrayer.name] : 'Hazırlan'}
              </Text>
            </View>
            <View style={styles.heroCountdownTime}>
              <Ionicons name="time-outline" size={18} color="#E0F2FE" />
              <Text style={styles.heroCountdownClock}>
                {nextPrayer?.time ? formatTime(nextPrayer.time) : '--:--'}
              </Text>
            </View>
          </View>

          <View style={styles.heroTimerRow}>
            {['hours', 'minutes', 'seconds'].map((unit, index) => (
              <React.Fragment key={unit}>
                <View style={styles.heroTimerBox}>
                  <Text style={styles.heroTimerText}>
                    {timeRemaining ? timeRemaining[unit].toString().padStart(2, '0') : '--'}
                  </Text>
                  <Text style={styles.heroTimerLabel}>
                    {unit === 'hours' ? 'SAAT' : unit === 'minutes' ? 'DAKİKA' : 'SANİYE'}
                  </Text>
                </View>
                {index < 2 && <Text style={styles.heroTimerDot}>:</Text>}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(prayerProgress * 100, 100)}%` }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressMetaText}>İlerleme {prayerProgressDisplay}</Text>
            <Text style={styles.progressMetaText}>
              Aktif: {currentPrayer ? PRAYER_NAMES[currentPrayer.name] : 'Belirleniyor'}
            </Text>
          </View>

          {loading && <ActivityIndicator color="#A5F3FC" style={styles.heroLoader} />}
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Ionicons
                name={notificationsEnabled ? 'notifications' : 'notifications-off'}
                size={16}
                color="#F0FDFA"
              />
              <Text style={styles.heroBadgeText}>
                {notificationsEnabled ? 'Bildirimler açık' : 'Bildirimler kapalı'}
              </Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Ezan Bildirimleri</Text>
              <Text style={styles.toggleSubtitle}>
                {notificationsEnabled ? 'Vakit girince ezan sesi çalar' : 'Bildirimler kapalı'}
              </Text>
              {!notificationsPrefLoaded && (
                <Text style={styles.toggleHelper}>Tercihler yükleniyor...</Text>
              )}
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              disabled={!notificationsPrefLoaded}
              trackColor={{ false: '#1F2937', true: '#34D399' }}
              thumbColor={notificationsEnabled ? '#052e16' : '#9CA3AF'}
              ios_backgroundColor="#1F2937"
            />
          </View>
        </View>

        <View style={styles.insightRow}>
          <View style={styles.insightCard}>
            <View style={styles.insightBadge}>
              <Ionicons name="calendar" size={16} color="#A7F3D0" />
              <Text style={styles.insightBadgeText}>Dini Gün</Text>
            </View>
            <Text style={styles.insightText}>
              {upcomingReligiousDay ? upcomingReligiousDay.name : 'Takvim güncel'}
            </Text>
            <Text style={styles.insightMeta}>
              {upcomingReligiousDay
                ? formatReligiousDate(upcomingReligiousDay.date)
                : 'Yaklaşan özel gün bulunmuyor'}
            </Text>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => setCalendarModalVisible(true)}
            >
              <Text style={styles.smallButtonText}>Takvimi aç</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Günün Vakitleri</Text>
          <Text style={styles.sectionSubtitle}>
            Uzun basarak rekat detaylarını görün, dokunarak ezanı dinleyin.
          </Text>
        </View>

        <View style={styles.prayerList}>
          {prayerTimes ? PRAYER_ORDER.map((key) => {
            const isActive = currentPrayer?.name === key;
            const isPlaying = playingSound === key;
            const time = prayerTimes[key];
            const config = {
              fajr: { icon: 'moon', color: '#C7D2FE', bg: 'rgba(99,102,241,0.15)' },
              sunrise: { icon: 'sunny-outline', color: '#FDBA74', bg: 'rgba(251,146,60,0.15)' },
              dhuhr: { icon: 'sunny', color: '#FDE68A', bg: 'rgba(250,204,21,0.15)' },
              asr: { icon: 'cloud-outline', color: '#7DD3FC', bg: 'rgba(14,165,233,0.15)' },
              maghrib: { icon: 'partly-sunny', color: '#FDBA74', bg: 'rgba(251,146,60,0.15)' },
              isha: { icon: 'moon-outline', color: '#E0E7FF', bg: 'rgba(71,85,105,0.25)' },
            }[key] || { icon: 'time-outline', color: '#e5e7eb', bg: 'rgba(148,163,184,0.2)' };
            const metaText =
              key === 'sunrise'
                ? 'Kerahat vaktinde ezan okunmaz'
                : isActive
                  ? 'Vakit içindesiniz'
                  : nextPrayer?.name === key
                    ? 'Sıradaki vakit'
                    : 'Hazırlık zamanı';

            return (
              <TouchableOpacity
                key={key}
                style={[styles.prayerCard, isActive && styles.prayerActive]}
                activeOpacity={0.85}
                onPress={() => openPrayerGuide(key)}
              >
                <View style={styles.prayerLeft}>
                  <View style={[styles.prayerIconShell, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon} size={22} color={config.color} />
                  </View>
                  <View style={styles.prayerInfo}>
                    <View style={styles.prayerTitleRow}>
                      <Text style={styles.prayerName}>{PRAYER_NAMES[key]}</Text>
                      {isActive && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Şimdi</Text>
                        </View>
                      )}
                      {isPlaying && (
                        <Ionicons
                          name="volume-high"
                          size={16}
                          color={config.color}
                          style={styles.playingIcon}
                        />
                      )}
                    </View>
                    <Text style={styles.prayerMetaText}>{metaText}</Text>
                  </View>
                </View>
                <View style={styles.prayerRight}>
                  <Text style={styles.prayerTime}>{formatTime(time)}</Text>
                </View>
              </TouchableOpacity>
            );
          }) : (
            <Text style={styles.placeholderText}>Namaz vakitleri yükleniyor...</Text>
          )}
        </View>

        <View style={styles.habitsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Zikir & Hedefler</Text>
            <Text style={styles.sectionSubtitle}>
              Günlük ve haftalık zikrinizi kısa önerilerle takip edin.
            </Text>
          </View>

          {!zikrLoaded ? (
            <ActivityIndicator color="#A5F3FC" style={{ marginVertical: 24 }} />
          ) : (
            <View style={styles.habitGrid}>
              {ZIKR_GOALS.map((goal) => {
                const value = zikrProgress[goal.key] ?? 0;
                const ratio = Math.min(value / goal.target, 1);
                const remaining = Math.max(goal.target - value, 0);
                const disableMinus = value <= 0;
                const disablePlus = value >= goal.target;
                return (
                  <View key={goal.key} style={styles.habitCard}>
                    <View style={styles.habitHeader}>
                      <View>
                        <Text style={styles.habitLabel}>{goal.label}</Text>
                        <Text style={styles.habitPeriod}>
                          {goal.period} hedef • {value}/{goal.target} {goal.unit}
                        </Text>
                      </View>
                      <View style={[styles.habitChip, { borderColor: goal.color }]}>
                        <Text style={[styles.habitChipText, { color: goal.color }]}>
                          {goal.period}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.habitSuggestion}>{goal.suggestion}</Text>
                    <Text style={styles.habitReminder}>{goal.reminder}</Text>
                    <View style={styles.habitProgressTrack}>
                      <View
                        style={[
                          styles.habitProgressFill,
                          { width: `${ratio * 100}%`, backgroundColor: goal.color },
                        ]}
                      />
                    </View>
                    <View style={styles.habitProgressMeta}>
                      <Text style={styles.habitRemaining}>
                        Kalan: {remaining} {goal.unit}
                      </Text>
                      <Text style={styles.habitPercent}>{Math.round(ratio * 100)}%</Text>
                    </View>
                    <View style={styles.habitActions}>
                      <TouchableOpacity
                        style={[
                          styles.habitActionBtn,
                          styles.habitActionBtnMinus,
                          disableMinus && styles.habitActionBtnDisabled,
                        ]}
                        disabled={disableMinus}
                        activeOpacity={0.8}
                        onPress={() => updateZikrProgress(goal.key, -1)}
                      >
                        <Ionicons name="remove" size={18} color="#F8FAFC" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.habitActionBtn,
                          styles.habitActionBtnAdd,
                          disablePlus && styles.habitActionBtnDisabled,
                        ]}
                        disabled={disablePlus}
                        activeOpacity={0.8}
                        onPress={() => updateZikrProgress(goal.key, 1)}
                      >
                        <Ionicons name="add" size={18} color="#022c22" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.yasinCard}>
            <View style={styles.yasinText}>
              <Text style={styles.yasinTitle}>Yasin Suresi Tam Metin</Text>
              <Text style={styles.yasinSubtitle}>
                1-83. ayetlerin okunuşu ve anlamını ihtiyaç duyduğunuzda açıp okuyun.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.yasinButton}
              activeOpacity={0.85}
              onPress={() => setYasinModalVisible(true)}
            >
              <Ionicons name="book" size={18} color="#1e3a8a" style={styles.yasinButtonIcon} />
              <Text style={styles.yasinButtonText}>Yasin’i Oku</Text>
            </TouchableOpacity>
          </View>
        </View>

        {qiblaAngle !== null && (
          <View style={styles.qiblaContainer}>
            <View style={styles.qiblaHeader}>
              <View style={styles.qiblaHeaderLeft}>
                <View style={styles.qiblaIconShell}>
                  <Ionicons name="compass" size={18} color="#0f172a" />
                </View>
                <View>
                  <Text style={styles.qiblaTitle}>Kıble Pusulası</Text>
                  <Text style={styles.qiblaSubtitle}>Cihaz başlığı: {deviceHeadingDisplay}</Text>
                </View>
              </View>
            </View>

            <View style={styles.directionCard}>
              <View style={styles.directionBadge}>
                <Ionicons name="navigate" size={16} color="#93C5FD" />
                <Text style={styles.directionBadgeText}>Kıble yönlendirme</Text>
              </View>
              <Text style={styles.directionText}>{directionMessage}</Text>
              <View style={styles.directionMetaRow}>
                <View style={[styles.directionMetaItem, styles.directionMetaItemDivider]}>
                  <Text style={styles.directionMetaLabel}>Fark</Text>
                  <Text style={styles.directionMetaValue}>{qiblaDiffDisplay}</Text>
                </View>
                <View style={styles.directionMetaItem}>
                  <Text style={styles.directionMetaLabel}>Cihaz</Text>
                  <Text style={styles.directionMetaValue}>{deviceHeadingDisplay}</Text>
                </View>
              </View>
            </View>

            <View style={styles.compassWrapper}>
              <View style={[
                styles.compassGlow,
                isQiblaAligned && styles.compassGlowAligned
              ]} />
              <View style={[
                styles.compassCircle,
                isQiblaAligned && styles.compassCircleAligned
              ]}>
                {cardinalPoints.map(({ label, style }) => (
                  <Text key={label} style={[styles.cardinalLabel, style]}>
                    {label}
                  </Text>
                ))}

                {Array.from({ length: 12 }).map((_, index) => (
                  <View key={`tick-${index}`} style={[styles.tickWrapper, { transform: [{ rotate: `${index * 30}deg` }] }]}>
                    <View style={styles.tick} />
                  </View>
                ))}

                <View style={[
                  styles.innerRing,
                  isQiblaAligned && styles.innerRingAligned
                ]} />
                <View style={[
                  styles.centerDot,
                  isQiblaAligned && styles.centerDotAligned
                ]} />
                <View style={styles.northMarker} />
                <Animated.View
                  style={[
                    styles.qiblaNeedleWrapper,
                    {
                      transform: [
                        { rotate: rotateAnim.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] }) },
                        { scale: arrowPulseAnim },
                      ],
                    },
                  ]}
                >
                  <View style={styles.qiblaNeedleStem} />
                  <View style={styles.qiblaNeedleHead} />
                </Animated.View>
              </View>
            </View>

            <View style={styles.qiblaInfoRow}>
              <View style={styles.qiblaInfoCard}>
                <Text style={styles.infoLabel}>Kıble Açısı</Text>
                <Text style={styles.infoValue}>{qiblaAngleDisplay}</Text>
              </View>
              <View style={styles.qiblaInfoCard}>
                <Text style={styles.infoLabel}>Cihaz Yönü</Text>
                <Text style={styles.infoValue}>{deviceHeadingDisplay}</Text>
              </View>
              <View style={styles.qiblaInfoCard}>
                <Text style={styles.infoLabel}>Fark</Text>
                <Text style={[styles.infoValue, isQiblaAligned && styles.infoValueAligned]}>{qiblaDiffDisplay}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.focusGrid}>
          <View style={styles.focusCard}>
            <View style={styles.focusBadge}>
              <Ionicons name="book-outline" size={16} color="#C7D2FE" />
              <Text style={styles.focusBadgeText}>Günün Notu</Text>
            </View>
            <Text style={styles.focusTitle}>{focusReflection.title}</Text>
            <Text style={styles.focusBody}>{focusReflection.body}</Text>
          </View>

          <View style={[styles.focusCard, styles.memorialCard]}>
            <Text style={styles.memorialTitle}>"Zeliha Tiryakioğlu" hayrına yapılmıştır.</Text>
            <Text style={styles.memorialSubtitle}>Ruhuna bir Fatiha okumanız dileğiyle...</Text>
          </View>
        </View>
      </ScrollView>

      {/* Dini Günler Modal */}
      <Modal
        visible={calendarModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.calendarModal]}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.modalTitle}>Dini Günler</Text>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setCalendarModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.calendarList}
              contentContainerStyle={styles.calendarListContent}
              showsVerticalScrollIndicator={false}
            >
              {RELIGIOUS_DAYS.map((item, index) => {
                const showYearLabel = index === 0 || RELIGIOUS_DAYS[index - 1].year !== item.year;
                const dateObj = new Date(item.date);
                const isUpcoming = upcomingReligiousDay && upcomingReligiousDay.date === item.date;
                const isPast = dateObj < todayStart;
                return (
                  <View key={`${item.date}-${item.name}`}>
                    {showYearLabel && (
                      <Text style={styles.calendarYearLabel}>{item.year}</Text>
                    )}
                    <View
                      style={[
                        styles.calendarCard,
                        isUpcoming && styles.calendarCardUpcoming,
                        isPast && styles.calendarCardPast,
                      ]}
                    >
                      <View>
                        <Text
                          style={[
                            styles.calendarName,
                            isPast && styles.calendarTextPast,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.calendarDate,
                            isPast && styles.calendarTextPast,
                          ]}
                        >
                          {formatReligiousDate(item.date)}
                        </Text>
                      </View>
                      {isUpcoming && (
                        <View style={styles.upcomingBadge}>
                          <Ionicons
                            name="leaf"
                            size={14}
                            color="#15803D"
                            style={styles.upcomingBadgeIcon}
                          />
                          <Text style={styles.upcomingBadgeText}>Yaklaşıyor</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Namaz Rehberi Modal */}
      <Modal
        visible={guideModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGuideModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.guideModal]}>
            <View style={styles.guideHeader}>
              <View>
                <Text style={styles.modalTitle}>{guideContent?.name}</Text>
                <Text style={styles.modalRakats}>{guideContent?.rakats}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setGuideModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDetail}>{guideContent?.detail}</Text>

            <View style={styles.guideCard}>
              <Text style={styles.guideCardLabel}>Kısa Sure / Tilavet</Text>
              <Text style={styles.guideCardText}>{guideContent?.shortSurah}</Text>
            </View>

            <View style={styles.guideCard}>
              <Text style={styles.guideCardLabel}>Dua Önerisi</Text>
              <Text style={styles.guideCardText}>{guideContent?.dua}</Text>
            </View>

            <View style={styles.guideCard}>
              <Text style={styles.guideCardLabel}>Kur'an Hatırlatması</Text>
              <Text style={styles.guideCardText}>{guideContent?.quranVerse}</Text>
            </View>

            <View style={styles.guideCard}>
              <Text style={styles.guideCardLabel}>Tefsir Notu</Text>
              <Text style={styles.guideCardText}>{guideContent?.commentary}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.playButton,
                guideContent?.key === 'sunrise' && styles.playButtonDisabled,
              ]}
              disabled={guideContent?.key === 'sunrise'}
              onPress={() => guideContent && handlePrayerSoundPress(guideContent.key)}
            >
              <Ionicons name="musical-notes" size={18} color="#022c22" />
              <Text style={styles.playButtonText}>
                {guideContent?.key === 'sunrise' ? 'Bu vakitte ezan çalınmaz' : 'Ezanı Dinle'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Yasin-i Şerif Modal */}
      <Modal
        visible={yasinModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setYasinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.yasinModal]}>
            <View style={styles.yasinModalHeader}>
              <View>
                <Text style={styles.modalTitle}>Yasin-i Şerif</Text>
                <Text style={styles.modalSubtitle}>Tam okunuş ve anlam rehberi</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setYasinModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.yasinList} showsVerticalScrollIndicator={false}>
              {YASIN_LINES.map((line, index) => {
                if (line.type === 'heading') {
                  return (
                    <Text key={index} style={[styles.yasinLine, styles.yasinHeading]}>
                      {line.text}
                    </Text>
                  );
                }
                if (line.type === 'divider') {
                  return <View key={index} style={styles.yasinDivider} />;
                }
                if (line.type === 'label') {
                  return (
                    <Text key={index} style={[styles.yasinLine, styles.yasinLabel]}>
                      {line.text}
                    </Text>
                  );
                }
                if (line.type === 'arabic') {
                  return (
                    <Text key={index} style={[styles.yasinLine, styles.yasinArabicLine]}>
                      {line.text}
                    </Text>
                  );
                }
                if (line.type === 'meaning') {
                  return (
                    <Text key={index} style={[styles.yasinLine, styles.yasinMeaningLine]}>
                      {line.text}
                    </Text>
                  );
                }
                return (
                  <Text key={index} style={styles.yasinLine}>
                    {line.text}
                  </Text>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.yasinCloseButton}
              onPress={() => setYasinModalVisible(false)}
            >
              <Text style={styles.yasinCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    backgroundColor: '#010817',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  heroCard: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: 'rgba(15,23,42,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    marginBottom: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroChip: {
    fontSize: 12,
    color: '#A5F3FC',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroLocation: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  heroDate: {
    fontSize: 14,
    color: 'rgba(248,250,252,0.7)',
    marginTop: 2,
  },
  heroLogo: {
    width: 72,
    height: 72,
    opacity: 0.85,
  },
  heroCountdownRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCountdownLabel: {
    color: 'rgba(248,250,252,0.6)',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroCountdownPrayer: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  heroCountdownTime: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,118,110,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroCountdownClock: {
    color: '#ECFDF3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  heroTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  heroTimerBox: {
    width: '32%',
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center',
  },
  heroTimerText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
  },
  heroTimerLabel: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(248,250,252,0.6)',
    letterSpacing: 2,
  },
  heroTimerDot: {
    fontSize: 30,
    color: 'rgba(248,250,252,0.3)',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.25)',
    marginTop: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#34D399',
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressMetaText: {
    color: 'rgba(248,250,252,0.7)',
    fontSize: 13,
  },
  heroLoader: {
    marginTop: 16,
  },
  errorText: {
    color: '#F87171',
    marginTop: 8,
    fontSize: 13,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,118,110,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 12,
    marginTop: 8,
  },
  heroBadgeText: {
    marginLeft: 6,
    color: '#E0F2FE',
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    marginBottom: 24,
  },
  toggleRow: {
    marginTop: 18,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextCol: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleSubtitle: {
    color: 'rgba(248,250,252,0.65)',
    marginTop: 2,
    fontSize: 13,
  },
  toggleHelper: {
    marginTop: 4,
    color: '#FBBF24',
    fontSize: 12,
  },
  primaryAction: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#22C55E',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 16,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  primaryActionText: {
    color: '#022c22',
    fontSize: 18,
    fontWeight: '700',
  },
  primaryActionSub: {
    color: '#065f46',
    fontSize: 13,
    marginTop: 2,
  },
  insightRow: {
    marginTop: 24,
    marginBottom: 24,
  },
  insightCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    marginBottom: 16,
  },
  insightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightBadgeText: {
    marginLeft: 6,
    color: 'rgba(248,250,252,0.7)',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  insightText: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightMeta: {
    color: 'rgba(248,250,252,0.65)',
    fontSize: 13,
  },
  smallButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.5)',
    backgroundColor: 'rgba(59,130,246,0.2)',
  },
  smallButtonText: {
    color: '#BFDBFE',
    fontSize: 13,
    fontWeight: '600',
  },
  habitsSection: {
    marginTop: 12,
    marginBottom: 28,
  },
  habitGrid: {},
  habitCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    marginBottom: 14,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  habitLabel: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  habitPeriod: {
    color: 'rgba(248,250,252,0.65)',
    fontSize: 13,
    marginTop: 4,
  },
  habitChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  habitChipText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  habitSuggestion: {
    color: 'rgba(248,250,252,0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  habitReminder: {
    color: '#fcd34d',
    fontSize: 12,
    marginTop: 6,
  },
  habitProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(15,23,42,0.5)',
    borderRadius: 999,
    marginTop: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  habitProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  habitProgressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  habitRemaining: {
    color: 'rgba(248,250,252,0.7)',
    fontSize: 12,
  },
  habitPercent: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  habitActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  habitActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(148,163,184,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitActionBtnMinus: {
    marginRight: 10,
  },
  habitActionBtnAdd: {
    backgroundColor: '#4ade80',
  },
  habitActionBtnDisabled: {
    opacity: 0.5,
  },
  yasinCard: {
    marginTop: 8,
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(30,64,175,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
  },
  yasinText: {
    marginBottom: 12,
  },
  yasinTitle: {
    color: '#BFDBFE',
    fontSize: 18,
    fontWeight: '700',
  },
  yasinSubtitle: {
    color: 'rgba(191,219,254,0.8)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  yasinButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#bfdbfe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  yasinButtonIcon: {
    marginRight: 8,
  },
  yasinButtonText: {
    color: '#1e3a8a',
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: 'rgba(248,250,252,0.6)',
    fontSize: 13,
    marginTop: 4,
  },
  prayerList: {
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    padding: 14,
    marginBottom: 28,
  },
  prayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  prayerActive: {
    borderColor: 'rgba(74,222,128,0.7)',
    backgroundColor: 'rgba(16,185,129,0.16)',
  },
  prayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prayerIconShell: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  prayerName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  prayerMetaText: {
    color: 'rgba(248,250,252,0.65)',
    fontSize: 13,
    marginTop: 4,
  },
  prayerRight: {
    marginLeft: 12,
  },
  prayerTime: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  placeholderText: {
    color: 'rgba(248,250,252,0.6)',
    textAlign: 'center',
    paddingVertical: 16,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(187,247,208,0.2)',
  },
  currentBadgeText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  playingIcon: {
    marginLeft: 6,
  },
  qiblaContainer: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: 'rgba(15,23,42,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    marginBottom: 28,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 10,
  },
  qiblaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qiblaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  directionBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    letterSpacing: 1,
    color: 'rgba(248,250,252,0.7)',
    textTransform: 'uppercase',
  },
  directionText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  directionMetaRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  directionMetaItem: {
    flex: 1,
  },
  directionMetaItemDivider: {
    marginRight: 12,
  },
  directionMetaLabel: {
    color: 'rgba(248,250,252,0.65)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  directionMetaValue: {
    marginTop: 4,
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  qiblaIconShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  qiblaTitle: {
    fontSize: 18,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  qiblaSubtitle: {
    fontSize: 13,
    color: 'rgba(248,250,252,0.6)',
    marginTop: 2,
  },
  compassWrapper: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(16,185,129,0.08)',
    shadowColor: '#10B981',
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  compassGlowAligned: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    shadowColor: '#22C55E',
  },
  compassCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#111c32',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  compassCircleAligned: {
    backgroundColor: '#052e23',
    borderColor: 'rgba(34,197,94,0.4)',
    shadowColor: '#22C55E',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  innerRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  innerRingAligned: {
    borderColor: 'rgba(34,197,94,0.4)',
  },
  northMarker: {
    position: 'absolute',
    width: 6,
    height: 30,
    borderRadius: 3,
    backgroundColor: '#F87171',
    top: 12,
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  centerDotAligned: {
    backgroundColor: '#22C55E',
    borderColor: '#052e23',
  },
  cardinalLabel: {
    position: 'absolute',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardinalNorth: {
    top: 18,
  },
  cardinalSouth: {
    bottom: 18,
  },
  cardinalEast: {
    right: 18,
  },
  cardinalWest: {
    left: 18,
  },
  tickWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  tick: {
    width: 2,
    height: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 10,
  },
  qiblaNeedleWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qiblaNeedleStem: {
    width: 4,
    height: 80,
    borderRadius: 2,
    backgroundColor: 'rgba(16,185,129,0.7)',
  },
  qiblaNeedleHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#34D399',
    marginTop: -2,
  },
  qiblaInfoRow: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
  },
  qiblaInfoCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  infoValueAligned: {
    color: '#34D399',
  },
  focusGrid: {
    marginBottom: 60,
  },
  focusCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(15,23,42,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    marginBottom: 16,
  },
  focusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  focusBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    color: 'rgba(248,250,252,0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  focusTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  focusBody: {
    color: 'rgba(248,250,252,0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  memorialCard: {
    backgroundColor: 'rgba(15,15,30,0.85)',
    borderColor: 'rgba(156,163,175,0.35)',
    alignItems: 'center',
  },
  memorialTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  memorialSubtitle: {
    marginTop: 6,
    color: '#A5F3FC',
    fontSize: 13,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '85%',
    alignItems: 'center',
  },
  guideModal: {
    alignItems: 'stretch',
    width: '90%',
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalRakats: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  modalDetail: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
  },
  guideCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  guideCardLabel: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#94A3B8',
  },
  guideCardText: {
    marginTop: 6,
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 22,
  },
  playButton: {
    marginTop: 12,
    backgroundColor: '#A7F3D0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  playButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  playButtonText: {
    marginLeft: 8,
    color: '#065f46',
    fontSize: 16,
    fontWeight: '600',
  },
  yasinModal: {
    width: '90%',
    maxHeight: '80%',
    alignItems: 'stretch',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  yasinModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  yasinList: {
    marginTop: 8,
  },
  yasinFullText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 22,
  },
  yasinLine: {
    marginBottom: 10,
  },
  yasinHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 6,
  },
  yasinDivider: {
    height: 8,
  },
  yasinLabel: {
    fontWeight: '700',
    color: '#0F172A',
  },
  yasinArabicLine: {
    color: '#059669',
    fontSize: 16,
    marginTop: 2,
  },
  yasinMeaningLine: {
    color: '#dc2626',
    marginTop: 2,
  },
  yasinCloseButton: {
    marginTop: 18,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  yasinCloseButtonText: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
  },
  calendarModal: {
    width: '90%',
    maxHeight: '75%',
    alignItems: 'stretch',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalCloseIcon: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  calendarList: {
    flexGrow: 0,
  },
  calendarListContent: {
    paddingBottom: 10,
  },
  calendarYearLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 6,
  },
  calendarCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarCardUpcoming: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86efac',
  },
  calendarCardPast: {
    opacity: 0.85,
  },
  calendarName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  calendarDate: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  calendarTextPast: {
    color: '#94A3B8',
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  upcomingBadgeIcon: {
    marginRight: 4,
  },
  upcomingBadgeText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  splashText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  splashQuoteCard: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(17,24,39,0.85)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    alignItems: 'center',
  },
  splashQuote: {
    color: '#F9FAFB',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
  },
  splashQuoteRef: {
    marginTop: 6,
    color: '#A5F3FC',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});


