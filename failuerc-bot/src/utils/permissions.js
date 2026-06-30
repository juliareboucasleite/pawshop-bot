const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');

function hasPermission(member, permission) {
  if (!member?.permissions) return false;
  if (typeof member.permissions.has === 'function') {
    return member.permissions.has(permission);
  }
  return new PermissionsBitField(BigInt(member.permissions)).has(permission);
}

function hasRole(member, roleId) {
  if (!member?.roles) return false;
  if (member.roles.cache?.has(roleId)) return true;
  if (Array.isArray(member.roles)) return member.roles.includes(roleId);
  return false;
}

function isAdmin(member) {
  return hasPermission(member, PermissionFlagsBits.Administrator)
    || hasPermission(member, PermissionFlagsBits.ManageGuild);
}

function isModerator(member, supportRoleIds = []) {
  if (isAdmin(member)) return true;
  if (hasPermission(member, PermissionFlagsBits.ManageChannels)) return true;
  return supportRoleIds.some((id) => hasRole(member, id));
}

module.exports = { isAdmin, isModerator, hasRole };
