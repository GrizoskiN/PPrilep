const fs = require('fs');
const file = 'd:/GrizoskiDesign/ppp/pprilep/components/issues/IssueDetail.tsx';
let content = fs.readFileSync(file, 'utf8');

const search =           ))}

                setIsAffected(!isAffected);
                if (isAffected) {
                  await sb;

const replacement =           ))}

          {/* Counts row - same layout as IssueCard */}
          <div className="flex items-center gap-4 lg:gap-5">
            {/* Иста мака - always shown first (before Помогни) */}
            <div className="relative flex items-center gap-1.5 order-first">
              <button
                onClick={async () => {
                  if (!userId) {
                    redirectToAuth();
                    return;
                  }
                  const { createClient } =
                    await import("../../lib/supabase/client");
                  const sb = createClient();
                  // Optimistic - update immediately so the color changes on tap
                  setIsAffected(!isAffected);
                  if (isAffected) {
                    await sb;

if (content.includes(search)) {
  content = content.replace(search, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed syntax error!');
} else {
  console.log('Could not find search string.');
}
