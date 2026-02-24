"use client";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Users, Send, Globe } from "lucide-react";
import CampaignsTab, { EmailCampaign, EmailGroup as CGroup, EmailTemplate } from "./CampaignsTab";
import ContactsTab, { EmailContact, EmailGroup as CTGroup } from "./ContactsTab";
import GroupsTab, { EmailGroup } from "./GroupsTab";

export default function EmailMarketingPage() {
  const [tab, setTab] = useState("campaigns");

  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [contactTotal, setContactTotal] = useState(0);
  const [contactsLoading, setContactsLoading] = useState(false);

  const [groups, setGroups] = useState<EmailGroup[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const fetchContacts = async (search = "") => {
    setContactsLoading(true);
    const r = await fetch(`/api/admin/email-contacts?search=${encodeURIComponent(search)}&limit=100`);
    if (r.ok) { const d = await r.json(); setContacts(d.contacts); setContactTotal(d.total); }
    setContactsLoading(false);
  };

  const fetchGroups = async () => {
    const r = await fetch("/api/admin/email-groups");
    if (r.ok) setGroups(await r.json());
  };

  const fetchCampaigns = async () => {
    setCampaignsLoading(true);
    const r = await fetch("/api/admin/email-campaigns");
    if (r.ok) setCampaigns(await r.json());
    setCampaignsLoading(false);
  };

  const fetchTemplates = async () => {
    const r = await fetch("/api/admin/email-templates");
    if (r.ok) { const d = await r.json(); setTemplates(d.templates || d); }
  };

  useEffect(() => {
    fetchContacts();
    fetchGroups();
    fetchCampaigns();
    fetchTemplates();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />Email Marketing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage contacts, groups, and send campaigns with throttled delivery for Hostinger
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="campaigns">
            <Send className="h-3.5 w-3.5 mr-1.5" />Campaigns
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <Users className="h-3.5 w-3.5 mr-1.5" />Contacts ({contactTotal})
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Globe className="h-3.5 w-3.5 mr-1.5" />Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignsTab
            campaigns={campaigns}
            groups={groups as CGroup[]}
            templates={templates}
            contactTotal={contactTotal}
            loading={campaignsLoading}
            onRefresh={fetchCampaigns}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsTab
            contacts={contacts}
            total={contactTotal}
            groups={groups as CTGroup[]}
            loading={contactsLoading}
            onRefresh={fetchContacts}
          />
        </TabsContent>

        <TabsContent value="groups">
          <GroupsTab
            groups={groups}
            onRefresh={fetchGroups}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
