export function shouldShowFeedLoading({ status, sessionLoadingTimedOut, hasInitialFeedData }) {
  return status === "loading" && !sessionLoadingTimedOut && !hasInitialFeedData;
}
