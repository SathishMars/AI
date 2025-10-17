/**
 * Mock MRf Template DB Utility
 *
 * This file provides a lightweight mock class used during development and tests
 * to fetch MRf template (id/name/organization) information. It intentionally
 * does not talk to a real database; instead it returns a filtered subset of
 * in-memory mock data.
 */

export interface MrfTemplateSummary {
  id: string;
  name: string;
  organization?: string | null;
  account: string;
  ownerUserId?: string;
}

export class MrfTemplateDBUtil {
  // Mock dataset declared as an in-class constant
  private static readonly MOCK_TEMPLATES: MrfTemplateSummary[] = [
    { id: 'tpl0000001', name: 'Other Meetings MRF', organization: null, account: 'groupize-demos', ownerUserId: 'user1' },
    { id: 'tpl0000002', name: 'All Hands Request', organization: 'main-main-org', account: 'groupize-demos', ownerUserId: 'user2' },
    { id: 'tpl0000003', name: 'Conference Request', organization: 'main-org', account: 'groupize-demos', ownerUserId: 'user1' },
    { id: 'tpl0000004', name: 'Annual Event', organization: 'main-org', account: 'groupize-demos', ownerUserId: 'user3' },
    { id: 'tpl0000005', name: 'Team Lunch', organization: 'main-org', account: 'groupize-demos', ownerUserId: 'user1' },
    { id: 'tpl0000006', name: 'Meeting Approval Form', organization: 'main-org', account: 'groupize-demos', ownerUserId: 'user1' },
  ];

  /**
   * Get MRf templates for given account. Optionally filter by organization and/or owner user id.
   * Returns an array of template summaries (id, name, organization)
   */
  public static async getTemplatesForAccount(
    account: string,
    organization?: string | null,
    userId?: string | null,
  ): Promise<Array<Pick<MrfTemplateSummary, 'id' | 'name' | 'organization'>>> {

    // simulate async DB call
    await new Promise((r) => setTimeout(r, 10));

    let results = MrfTemplateDBUtil.MOCK_TEMPLATES.filter((t) => t.account === account);

    if (organization !== undefined && organization !== null) {
      results = results.filter((t) => t.organization === organization);
    }

    if (userId !== undefined && userId !== null) {
      results = results.filter((t) => t.ownerUserId === userId);
    }

    return results.map(({ id, name, organization }) => ({ id, name, organization }));
  }
}

export default MrfTemplateDBUtil;
