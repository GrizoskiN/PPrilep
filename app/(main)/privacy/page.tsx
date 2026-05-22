
export const metadata = {
  title: "Политика на приватност — Подобар Прилеп",
};

export default function PrivacyPage() {
  return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-sm text-zinc-700 leading-relaxed">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Политика на приватност</h1>
          <p className="text-xs text-zinc-400 mt-1">Последна измена: мај 2025</p>
        </div>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-800">1. За апликацијата</h2>
          <p>
            Подобар Прилеп е граѓанска платформа за пријавување и следење на
            комунални проблеми во градот Прилеп. Апликацијата им овозможува на
            граѓаните да пријавуваат проблеми, да гласаат за постоечки пријави и
            да следат информации од јавните комунални претпријатија.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-800">2. Кои податоци ги собираме</h2>
          <p>При регистрација и користење на апликацијата може да собираме:</p>
          <ul className="list-disc pl-5 space-y-1 text-zinc-600">
            <li>Е-маил адреса и корисничко ime (при регистрација)</li>
            <li>Фотографии и описи на пријавени проблеми</li>
            <li>Локациски информации (улица/населба) поврзани со пријавите</li>
            <li>Коментари и интеракции со пријави</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-800">3. Како ги користиме податоците</h2>
          <p>Собраните податоци ги користиме исклучиво за:</p>
          <ul className="list-disc pl-5 space-y-1 text-zinc-600">
            <li>Прикажување на пријавите на јавната платформа</li>
            <li>Испраќање известувања поврзани со вашите пријави</li>
            <li>Подобрување на функционалноста на апликацијата</li>
          </ul>
          <p>Не продаваме и не споделуваме лични податоци со трети страни.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-800">4. Јавни информации</h2>
          <p>
            Пријавите, коментарите и профилните имиња се јавно видливи на
            платформата. Не објавувајте информации кои не сакате да бидат
            видливи за сите посетители.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-800">5. Податоци од Facebook</h2>
          <p>
            Апликацијата прикажува јавни објави од официјалната Facebook
            страница на ЈКП ВИК Прилеп исклучиво за информативни цели.
            Не собираме никакви лични податоци од Facebook корисници.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-800">6. Безбедност</h2>
          <p>
            Податоците се складирани на Supabase (EU регион) со вградена
            заштита и шифрирање. Пристапот до личните податоци е ограничен
            само на сопственикот на профилот.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-800">7. Бришење на профил</h2>
          <p>
            Можете да побарате бришење на вашиот профил и сите поврзани
            податоци со испраќање на барање на:{" "}
            <a
              href="mailto:contact@podobarprilep.mk"
              className="text-primary hover:underline">
              contact@podobarprilep.mk
            </a>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-800">8. Контакт</h2>
          <p>
            За прашања поврзани со приватноста:{" "}
            <a
              href="mailto:contact@podobarprilep.mk"
              className="text-primary hover:underline">
              contact@podobarprilep.mk
            </a>
          </p>
        </section>
      </div>
  );
}
