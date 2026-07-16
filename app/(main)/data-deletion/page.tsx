export const metadata = {
  title: "Бришење на податоци — Мој Прилеп",
};

export default function DataDeletionPage() {
  return (
    <div className="space-y-6 text-sm text-zinc-700 leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Бришење на податоци (Data Deletion Policy)</h1>
        <p className="text-xs text-zinc-400 mt-1">Последна измена: мај 2025</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800">
          Во согласност со правилата за приватност на корисниците (вклучувајќи ги барањата на Apple App Store и Google Play Store), 
          имате право целосно да ги избришете вашите лични податоци од платформата Мој Прилеп.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-zinc-800 text-lg">Како да го избришете вашиот профил</h2>
        <p>
          Доколку сакате да го избришете вашиот профил и сите поврзани податоци, тоа можете да го направите 
          многу едноставно на следниот начин:
        </p>
        
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mt-2">
          <ol className="list-decimal pl-5 space-y-2 text-zinc-800 font-medium">
            <li>Отворете ја мобилната апликација или најавете се на веб-страницата.</li>
            <li>Одете во менито и изберете <span className="text-primary">„Мој Профил“</span> (во мобилната апликација).</li>
            <li>Скролајте најдолу до копчето <span className="text-red-600 font-bold">„Избриши профил“</span>.</li>
            <li>Кликнете и потврдете го бришењето во скокачкиот прозорец.</li>
          </ol>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-zinc-800 text-lg">Што се случува кога ќе го избришете профилот?</h2>
        <ul className="list-disc pl-5 space-y-1 text-zinc-600">
          <li>Сите ваши <strong>лични податоци</strong> (име, презиме, е-маил, профилна слика) се трајно бришат од нашата база на податоци.</li>
          <li>Вашите активни најави се прекинуваат (се одјавувате од сите уреди).</li>
          <li>Сите пријавени проблеми (issues) остануваат во системот за да можат надлежните да ги решат, но <strong>го губат авторството</strong> и се прикажуваат како објавени од "Анонимен Корисник".</li>
        </ul>
        <p className="mt-2 font-medium text-red-600">
          Овој процес е неповратен. Откако ќе го избришете профилот, не можете да ги вратите вашите податоци.
        </p>
      </section>

      <section className="space-y-2 pt-4">
        <h2 className="font-semibold text-zinc-800 text-lg">Алтернативен начин за бришење</h2>
        <p>
          Доколку немате пристап до апликацијата или не можете сами да го избришете профилот, 
          ве молиме испратете ни е-маил со барање за бришење на податоците од адресата со која 
          сте регистрирани на:
        </p>
        <p className="font-medium text-lg mt-1">
          <a
            href="mailto:hello@mojprilep.mk"
            className="text-primary hover:underline">
            hello@mojprilep.mk
          </a>
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Вашето барање ќе биде процесирано во рок од 3-5 работни денови.
        </p>
      </section>
    </div>
  );
}
