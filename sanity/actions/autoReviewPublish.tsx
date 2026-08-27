/**
 * "Публикувај" that also approves.
 *
 * A club / post that arrives through the public form is an unpublished draft
 * with `isSubmission: true, reviewed: false`. The public site filters
 * `isSubmission != true || reviewed == true`, so *publishing alone leaves it
 * invisible* — the editor also had to remember to flip the "Прегледано" toggle.
 *
 * This action removes that second step: when an editor publishes a submission
 * that has not been reviewed yet, it patches `reviewed = true` first, then
 * publishes. One click = approve. For anything already reviewed, or a document
 * that never was a submission, it behaves exactly like the default publish.
 *
 * Wired in sanity.config.ts for the `sportClub` and `sportPost` types.
 */

import { useDocumentOperation, type DocumentActionComponent } from "sanity";

export const AutoReviewPublishAction: DocumentActionComponent = (props) => {
  const { id, type, draft, published, onComplete } = props;
  const { patch, publish } = useDocumentOperation(id, type);

  const doc = draft ?? published;
  const needsReview = Boolean(doc?.isSubmission) && doc?.reviewed !== true;

  return {
    label: needsReview ? "Одобри и објави" : "Публикувај",
    // Mirror the default publish action's availability.
    disabled: publish.disabled ? true : false,
    onHandle: () => {
      // Setting reviewed on the draft first means the published version carries
      // it — and it drops out of the "за преглед" queue at the same moment.
      if (needsReview) patch.execute([{ set: { reviewed: true } }]);
      publish.execute();
      onComplete();
    },
  };
};

// Occupy the "publish" slot so Studio keeps the publish keyboard shortcut and
// primary-action styling bound to this action instead of the default one.
AutoReviewPublishAction.action = "publish";
