/// Organization utility functions matching web version

class OrganizationUtils {
  /// Get organization abbreviation from name
  /// Matches web: getOrganizationAbbreviation
  static String getOrganizationAbbreviation(String name) {
    if (name.isEmpty) return 'O';
    
    final words = name.trim().split(RegExp(r'\s+')).where((word) => word.isNotEmpty).toList();
    
    if (words.isEmpty) return 'O';
    
    if (words.length == 1) {
      final word = words[0];
      if (word.length <= 3) {
        return word.toUpperCase();
      }
      return word.substring(0, 3).toUpperCase();
    }
    
    return words
        .take(3)
        .map((word) => word.isNotEmpty ? word[0].toUpperCase() : '')
        .join('');
  }

  /// Standardize organization data
  /// Matches web: standardizeOrganizationData
  static Map<String, dynamic> standardizeOrganizationData({
    required String name,
    required String organizationType,
    required String adminEmail,
    String? phoneNumber,
    String? description,
    String? status,
    String? logoUrl,
  }) {
    final trimmedName = name.trim();
    final trimmedOrgType = organizationType.trim();
    final trimmedAdminEmail = adminEmail.trim();
    
    final phone = phoneNumber?.trim();
    final desc = description?.trim();
    final orgStatus = (status?.trim().isNotEmpty ?? false) ? status!.trim() : 'pending';
    
    return {
      'name': trimmedName,
      'organization_type': trimmedOrgType,
      'admin_email': trimmedAdminEmail,
      'phone_number': phone?.isNotEmpty == true ? phone : null,
      'description': desc?.isNotEmpty == true ? desc : null,
      'status': orgStatus,
      'logo_url': logoUrl,
    };
  }
}
