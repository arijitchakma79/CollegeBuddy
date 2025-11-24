const express = require("express");
const router = express.Router();
const supabase = require("../services/supabaseClient");
const { authenticateUser } = require("../middleware/auth");

// POST /api/memberships - Create a new membership (join an organization)
router.post('/', authenticateUser, async (req, res) => {
    const { org_id, role } = req.body;
    const user_id = req.user.id; // Get user ID from authenticated request
    
    // Validation
    if (!org_id) {
        return res.status(400).json({
            success: false,
            message: 'Organization ID is required'
        });
    }
    
    // Default role is 'member' if not provided
    const membershipRole = role || 'member';
    
    try {
        // Check if membership already exists
        const { data: existingMembership, error: checkError } = await supabase
            .from('organization_memberships')
            .select('*')
            .eq('user_id', user_id)
            .eq('org_id', org_id)
            .single();
        
        if (existingMembership) {
            return res.status(400).json({
                success: false,
                message: 'You are already a member of this organization'
            });
        }
        
        // Create membership
        const { data, error } = await supabase
            .from('organization_memberships')
            .insert({
                user_id: user_id,
                org_id: org_id,
                role: membershipRole
            })
            .select()
            .single();
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to create membership',
                error: error.message
            });
        }
        
        return res.status(201).json({
            success: true,
            message: 'Membership created successfully',
            membership: data
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while creating the membership',
            error: err.message
        });
    }
});

// GET /api/memberships - Get all memberships for the authenticated user
router.get('/', authenticateUser, async (req, res) => {
    const user_id = req.user.id;
    
    try {
        const { data, error } = await supabase
            .from('organization_memberships')
            .select(`
                *,
                organizations (
                    org_id,
                    name,
                    description
                )
            `)
            .eq('user_id', user_id)
            .order('membership_id', { ascending: false });
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to fetch memberships',
                error: error.message
            });
        }
        
        return res.json({
            success: true,
            memberships: data
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching memberships',
            error: err.message
        });
    }
});

// GET /api/memberships/organization/:org_id - Get all members of an organization
router.get('/organization/:org_id', authenticateUser, async (req, res) => {
    const { org_id } = req.params;
    const user_id = req.user.id;
    
    try {
        // First check if user is a member of this organization
        const { data: userMembership, error: checkError } = await supabase
            .from('organization_memberships')
            .select('role')
            .eq('user_id', user_id)
            .eq('org_id', org_id)
            .single();
        
        if (checkError || !userMembership) {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this organization'
            });
        }
        
        // Get all members of the organization
        const { data, error } = await supabase
            .from('organization_memberships')
            .select(`
                *,
                user_id
            `)
            .eq('org_id', org_id)
            .order('membership_id', { ascending: false });
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to fetch organization members',
                error: error.message
            });
        }
        
        return res.json({
            success: true,
            members: data,
            userRole: userMembership.role
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching organization members',
            error: err.message
        });
    }
});

// GET /api/memberships/user/:user_id - Get all memberships for a specific user (admin only)
router.get('/user/:user_id', authenticateUser, async (req, res) => {
    const { user_id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('organization_memberships')
            .select(`
                *,
                organizations (
                    org_id,
                    name,
                    description
                )
            `)
            .eq('user_id', user_id)
            .order('membership_id', { ascending: false });
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to fetch memberships',
                error: error.message
            });
        }
        
        return res.json({
            success: true,
            memberships: data
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching memberships',
            error: err.message
        });
    }
});

// PUT /api/memberships/:membership_id - Update membership role (admin only)
router.put('/:membership_id', authenticateUser, async (req, res) => {
    const { membership_id } = req.params;
    const { role } = req.body;
    const user_id = req.user.id;
    
    if (!role) {
        return res.status(400).json({
            success: false,
            message: 'Role is required'
        });
    }
    
    try {
        // Get the membership to check org_id
        const { data: membership, error: membershipError } = await supabase
            .from('organization_memberships')
            .select('org_id, user_id')
            .eq('membership_id', membership_id)
            .single();
        
        if (membershipError || !membership) {
            return res.status(404).json({
                success: false,
                message: 'Membership not found'
            });
        }
        
        // Check if user is admin of the organization
        const { data: userMembership, error: checkError } = await supabase
            .from('organization_memberships')
            .select('role')
            .eq('user_id', user_id)
            .eq('org_id', membership.org_id)
            .single();
        
        if (checkError || !userMembership || userMembership.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can update membership roles'
            });
        }
        
        // Update membership
        const { data, error } = await supabase
            .from('organization_memberships')
            .update({ role: role })
            .eq('membership_id', membership_id)
            .select()
            .single();
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update membership',
                error: error.message
            });
        }
        
        return res.json({
            success: true,
            message: 'Membership updated successfully',
            membership: data
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the membership',
            error: err.message
        });
    }
});

// DELETE /api/memberships/:membership_id - Delete a membership
router.delete('/:membership_id', authenticateUser, async (req, res) => {
    const { membership_id } = req.params;
    const user_id = req.user.id;
    
    try {
        // Get the membership to check ownership
        const { data: membership, error: membershipError } = await supabase
            .from('organization_memberships')
            .select('org_id, user_id, role')
            .eq('membership_id', membership_id)
            .single();
        
        if (membershipError || !membership) {
            return res.status(404).json({
                success: false,
                message: 'Membership not found'
            });
        }
        
        // Check if user is the member or an admin
        const { data: userMembership, error: checkError } = await supabase
            .from('organization_memberships')
            .select('role')
            .eq('user_id', user_id)
            .eq('org_id', membership.org_id)
            .single();
        
        if (checkError || !userMembership) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this membership'
            });
        }
        
        // Allow deletion if user is the member or an admin
        if (membership.user_id !== user_id && userMembership.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can remove other members'
            });
        }
        
        // Delete membership
        const { error } = await supabase
            .from('organization_memberships')
            .delete()
            .eq('membership_id', membership_id);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to delete membership',
                error: error.message
            });
        }
        
        return res.json({
            success: true,
            message: 'Membership deleted successfully'
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the membership',
            error: err.message
        });
    }
});

module.exports = router;

