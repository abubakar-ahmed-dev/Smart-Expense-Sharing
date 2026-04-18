import { Request, Response, NextFunction } from 'express';
import { groupService } from '../services/groupService.js';

export async function listGroups(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const groups = await groupService.getUserGroups(req.user.id);
    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId[0];
    const groups = await groupService.getUserGroups(userId);
    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGroupById(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const group = await groupService.getGroupByIdWithMembersForUser(groupId, req.user.id);
    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const group = await groupService.createGroup(req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const group = await groupService.updateGroup(groupId, req.body);
    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const group = await groupService.deleteGroup(groupId);
    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

export async function addGroupMember(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const member = await groupService.addMember(
      groupId,
      req.body,
      req.user.id,
    );
    res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeGroupMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const memberId = typeof req.params.memberId === 'string' ? req.params.memberId : req.params.memberId[0];
    const member = await groupService.removeMember(
      groupId,
      memberId,
      req.user.id,
    );
    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateGroupMemberRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const memberId = typeof req.params.memberId === 'string' ? req.params.memberId : req.params.memberId[0];
    const member = await groupService.updateMemberRole(
      groupId,
      memberId,
      req.body,
      req.user.id,
    );
    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGroupMembers(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : req.params.groupId[0];
    const members = await groupService.getGroupMembersForUser(groupId, req.user.id);
    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
}
