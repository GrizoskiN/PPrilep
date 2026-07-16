export const metadata = {
  title: "Поддршка — Мој Прилеп",
};

export default function SupportPage() {
  return (
    <div className="space-y-6 text-sm text-zinc-700 leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Корисничка Поддршка</h1>
        <p className="text-xs text-zinc-400 mt-1">Тука сме да ви помогнеме</p>
      </div>

      <section className="space-y-4">
        <p>
          Доколку имате некаков проблем со користењето на веб-страницата или мобилната 
          апликација Мој Прилеп, или пак имате предлог за подобрување на платформата, 
          слободно контактирајте нè.
        </p>

        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <svg className="w-10 h-10 text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h2 className="font-semibold text-zinc-800 text-lg mb-2">Е-маил за контакт</h2>
          <p className="mb-4 text-zinc-600">Најбрз начин да добиете одговор е преку нашиот е-маил:</p>
          <a
            href="mailto:hello@mojprilep.mk"
            className="text-primary hover:underline text-xl font-bold">
            hello@mojprilep.mk
          </a>
        </div>
      </section>

      <section className="space-y-2 pt-4">
        <h2 className="font-semibold text-zinc-800 text-lg">Најчесто поставувани прашања (FAQ)</h2>
        
        <div className="space-y-4 mt-4">
          <div>
            <h3 className="font-medium text-zinc-800">Како да пријавам проблем во мојата населба?</h3>
            <p className="text-zinc-600 mt-1">Отворете ја апликацијата, кликнете на "Пријави", внесете локација, слика и опис на проблемот и кликнете "Испрати".</p>
          </div>
          
          <div>
            <h3 className="font-medium text-zinc-800">Кој ги решава пријавените проблеми?</h3>
            <p className="text-zinc-600 mt-1">Проблемите можат да ги решаваат јавните претпријатија (доколку се во нивна надлежност) или пак граѓаните - херои преку волонтерски акции.</p>
          </div>
          
          <div>
            <h3 className="font-medium text-zinc-800">Како да го избришам мојот профил?</h3>
            <p className="text-zinc-600 mt-1">Можете да го избришете вашиот профил од мобилната апликација во делот "Мој Профил" или да ни пишете на е-маил. Повеќе детали на страницата за Бришење на податоци.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
