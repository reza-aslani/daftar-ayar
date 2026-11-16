"use client";

import { useEffect } from "react";
import { rememberPerson, type RecentPerson } from "@/lib/recent-people";

export function RememberPerson(person: RecentPerson) {
  const { id, code, title, group, groupLabel } = person;
  useEffect(() => {
    rememberPerson({ id, code, title, group, groupLabel });
  }, [id, code, title, group, groupLabel]);
  return null;
}
