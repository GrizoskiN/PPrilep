import sys

with open('d:/GrizoskiDesign/ppp/pprilep/components/issues/IssueDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

search = '''                setIsAffected(!isAffected);
                if (isAffected) {
                  await sb
                    .from("issue_affected")
                    .delete()
                    .eq("issue_id", currentIssue.id)
                    .eq("user_id", userId);
                } else {
                  await sb
                    .from("issue_affected")
                    .insert({ issue_id: currentIssue.id, user_id: userId });
                }
                loadPeopleStats();
              }}
              className={cn(
                "flex items-center gap-1 lg:gap-1.5 text-[10px] lg:text-sm font-medium transition-colors",
                isAffected
                  ? "text-[#427FFF]"
                  : "text-zinc-500 hover:text-[#427FFF]",
              )}>
              {/* IstaMakaIcon */}
              <svg
                width="14"
                height="18"
                viewBox="0 0 35 49"
                fill="none"
                className="shrink-0">
                <path
                  d="M31.6967 22.5259C31.437 22.1027 18.8969 1.5043 18.3718 0.667791C17.811 -0.221342 16.509 -0.22525 15.9447 0.671986C14.889 2.36722 2.58627 22.5886 2.58627 22.5886C0.893804 25.3019 0 28.4341 0 31.6487C9.5329e-05 41.1111 7.69734 48.8084 17.1597 48.8084C26.622 48.8084 34.3193 41.1112 34.3193 31.6488C34.3193 28.4105 33.4117 25.2559 31.6967 22.5259ZM17.1597 43.0886C16.3693 43.0886 15.7298 42.449 15.7298 41.6587C15.7298 40.8683 16.3693 40.2287 17.1597 40.2287C21.8909 40.2287 25.7395 36.3801 25.7395 31.6489C25.7395 30.8586 26.379 30.219 27.1694 30.219C27.9598 30.219 28.5994 30.8586 28.5994 31.6489C28.5994 37.9567 23.4688 43.0886 17.1597 43.0886Z"
                  fill="currentColor"
                />
              </svg>
              <span>Иста мака</span>
            </button>
          </div>
        </div>'''

replacement = '''          {/* Counts row - same layout as IssueCard */}
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
                    await sb
                      .from("issue_affected")
                      .delete()
                      .eq("issue_id", currentIssue.id)
                      .eq("user_id", userId);
                  } else {
                    await sb
                      .from("issue_affected")
                      .insert({ issue_id: currentIssue.id, user_id: userId });
                  }
                  loadPeopleStats();
                }}
                className={cn(
                  "p-1 -ml-1 transition-transform active:scale-95",
                  isAffected
                    ? "text-[#427FFF]"
                    : "text-zinc-800 hover:text-zinc-600",
                )}>
                {/* IstaMakaIcon */}
                <svg
                  viewBox="0 0 35 49"
                  fill="none"
                  className="h-6 w-auto lg:h-7 shrink-0">
                  <path
                    d="M31.6967 22.5259C31.437 22.1027 18.8969 1.5043 18.3718 0.667791C17.811 -0.221342 16.509 -0.22525 15.9447 0.671986C14.889 2.36722 2.58627 22.5886 2.58627 22.5886C0.893804 25.3019 0 28.4341 0 31.6487C9.5329e-05 41.1111 7.69734 48.8084 17.1597 48.8084C26.622 48.8084 34.3193 41.1112 34.3193 31.6488C34.3193 28.4105 33.4117 25.2559 31.6967 22.5259ZM17.1597 43.0886C16.3693 43.0886 15.7298 42.449 15.7298 41.6587C15.7298 40.8683 16.3693 40.2287 17.1597 40.2287C21.8909 40.2287 25.7395 36.3801 25.7395 31.6489C25.7395 30.8586 26.379 30.219 27.1694 30.219C27.9598 30.219 28.5994 30.8586 28.5994 31.6489C28.5994 37.9567 23.4688 43.0886 17.1597 43.0886Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <button
                onClick={() =>
                  affectedUsers.length > 0 && setShowAffectedPopup(true)
                }
                className={cn(
                  "text-[13px] lg:text-[14px] font-bold tabular-nums transition-colors",
                  affectedUsers.length > 0
                    ? "text-zinc-800 hover:text-[#427FFF] cursor-pointer"
                    : "text-zinc-500 cursor-default",
                )}>
                {(affectedUsers.length || currentIssue.affected_count || 0) > 0 ? (affectedUsers.length || currentIssue.affected_count || 0) : ""}
              </button>
            </div>

            {/* Помогни */}
            <div className="relative flex items-center gap-1.5 ml-2">
              <button
                onClick={() => {
                  if (!userId) {
                    redirectToAuth();
                    return;
                  }
                  setHelperOpen(true);
                }}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold transition-transform active:scale-95",
                  isHelperDirect
                    ? "bg-[#427FFF] text-white"
                    : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
                )}>
                {/* PomogniIcon */}
                <svg
                  viewBox="0 0 50 48"
                  fill="none"
                  className="h-4 w-auto shrink-0">
                  <path
                    d="M28 1.30983L27.6266 0.974772C26.003 -0.481681 23.435 -0.252463 22 1.30535L25.0012 4L28 1.30983Z"
                    fill="currentColor"
                  />
                  <path
                    d="M49.576 32.1351L46.4281 29C44.2775 31.143 39.6334 35.77 35.9831 39.4042C34.2457 41.1353 32.2348 42.5166 30 43.5172L34.0774 47.5779C34.6426 48.1408 35.5588 48.1407 36.124 47.5776L49.5762 34.1737C50.1413 33.6107 50.1413 32.698 49.576 32.1351Z"
                    fill="currentColor"
                  />
                  <path
                    d="M45.9744 25.6748C49.0811 22.3975 44.4512 17.8594 41.1035 20.9029L42.3191 19.709C45.4258 16.4286 40.7966 11.8937 37.4396 14.937L38.6638 13.7432C41.7731 10.4599 37.135 5.92765 33.7844 8.97032L35.0086 7.77732C38.1197 4.49237 33.4749 -0.0371303 30.1291 3.00457L27.3444 5.72967L29.7823 8.11729C33.3551 11.5221 31.4979 17.7049 26.6251 18.677C26.1633 20.9584 24.1155 22.9887 21.7549 23.4475C21.293 25.7332 19.2416 27.7652 16.875 28.2218C15.861 32.9889 9.60033 34.8115 6.08725 31.3015L3.65104 28.9157L0.433365 32.0644C-0.144521 32.6299 -0.144422 33.5468 0.433463 34.1123L14.1944 47.5761C14.7723 48.1414 15.7091 48.1413 16.2868 47.5757L21.5944 42.3792C26.2756 42.3792 30.7671 40.5584 34.0775 37.3178C39.1035 32.4016 45.9744 25.6748 45.9744 25.6748Z"
                    fill="currentColor"
                  />
                  <path
                    d="M7.64044 29.9682C10.9655 33.0935 15.5598 28.4359 12.4782 25.0675C15.8034 28.1926 20.3975 23.5352 17.3159 20.1667C20.6383 23.293 25.224 18.6283 22.1451 15.2667C25.4658 18.3906 30.0662 13.7376 26.9827 10.3659L19.7347 3.01426C18.3928 1.66191 16.2303 1.66191 14.8971 3.01426C13.5636 4.36662 13.5636 6.56275 14.8971 7.91511L16.1021 9.14009C12.7844 6.01275 8.17779 10.6854 11.273 14.0409L12.4781 15.2667C9.15451 12.1403 4.55843 16.7986 7.64044 20.1667L8.77998 21.3211C5.42347 18.3362 0.970948 22.9733 4.01629 26.2925L7.64044 29.9682Z"
                    fill="currentColor"
                  />
                </svg>
                <span>Помогни</span>
              </button>
              {(helperUsers.length || currentIssue.helper_count || 0) > 0 && (
                <button
                  onClick={() => helperUsers.length > 0 && setShowHelperPopup(true)}
                  className="text-[13px] lg:text-[14px] font-bold tabular-nums text-zinc-800 hover:text-[#427FFF] transition-colors ml-1">
                  {helperUsers.length || currentIssue.helper_count || 0}
                </button>
              )}
            </div>
          </div>
        </div>'''

if search in content:
    content = content.replace(search, replacement)
    with open('d:/GrizoskiDesign/ppp/pprilep/components/issues/IssueDetail.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed syntax error!")
else:
    print("Could not find search string.")
