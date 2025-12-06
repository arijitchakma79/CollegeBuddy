const express = require("express");
const router = express.Router();
const supabase = require("../services/supabaseClient");
const { authenticateUser } = require("../middleware/auth");


// POST /api/events/create - Create a new event
router.post('/create', authenticateUser, async (req, res) => {
    console.log('=== POST /api/events/create called ===');
    console.log('Request body:', req.body);
    console.log('User from req.user:', req.user);
    
    const { 
        title, 
        description, 
        location, 
        start_time, 
        end_time, 
        attendee_cap, 
        price_cents, 
        restricted_to_org,
        created_by_org_id 
    } = req.body;
    
    // Validation
    if (!title || title.trim() === '') {
        console.log('Validation failed: title is empty');
        return res.status(400).json({
            success: false,
            message: 'Event title is required'
        });
    }
    
    if (!start_time) {
        return res.status(400).json({
            success: false,
            message: 'Start time is required'
        });
    }
    
    if (!end_time) {
        return res.status(400).json({
            success: false,
            message: 'End time is required'
        });
    }
    
    // Validate that end_time is after start_time
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    if (endDate <= startDate) {
        return res.status(400).json({
            success: false,
            message: 'End time must be after start time'
        });
    }
    
    try {
        const user_id = req.user?.id; // Get user ID from authenticated request
        
        console.log('Creating event for user:', user_id);
        console.log('Event title:', title);
        
        if (!user_id) {
            console.error('No user_id found in req.user');
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Prepare event data
        const eventData = {
            created_by_user_id: user_id,
            title: title.trim(),
            start_time: start_time,
            end_time: end_time
        };
        
        
        if (description) {
            eventData.description = description.trim();
        }
        
        if (location) {
            eventData.location = location.trim();
        }
        
        if (created_by_org_id) {
            eventData.created_by_org_id = parseInt(created_by_org_id);
        }
        
        if (attendee_cap !== undefined && attendee_cap !== null) {
            eventData.attendee_cap = parseInt(attendee_cap);
        }
        
        if (price_cents !== undefined && price_cents !== null) {
            eventData.price_cents = parseInt(price_cents);
        }
        
        if (restricted_to_org !== undefined) {
            eventData.restricted_to_org = Boolean(restricted_to_org);
        }
        
        // Create the event
        const { data: eventDataResult, error: eventError } = await supabase
            .from('events')
            .insert(eventData)
            .select()
            .single();

        if (eventError) {
            console.error('Error creating event:', eventError);
            return res.status(400).json({
                success: false,
                message: 'Failed to create event',
                error: eventError.message
            });
        }

        console.log('Event created successfully:', eventDataResult);

        return res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event: eventDataResult
        });
    } catch (err) {
        console.error('Exception in create event:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while creating the event',
            error: err.message
        });
    }
});

// GET /api/events - Get events with optional filters
router.get('/', async (req, res) => {
    try {
        const { org_id, user_id, restricted } = req.query;
        
        let query = supabase
            .from('events')
            .select('*');
        
        // Filter by organization if provided
        if (org_id) {
            query = query.eq('created_by_org_id', parseInt(org_id));
        }
        
        // Filter by user if provided
        if (user_id) {
            query = query.eq('created_by_user_id', user_id);
        }
        
        // Filter by restricted status if provided
        if (restricted !== undefined) {
            query = query.eq('restricted_to_org', restricted === 'true');
        }
        
        // Order by start_time ascending (upcoming events first)
        query = query.order('start_time', { ascending: true });
        
        const { data, error } = await query;

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to fetch events',
                error: error.message
            });
        }

        return res.json({
            success: true,
            events: data || []
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching events',
            error: err.message
        });
    }
});

// GET /api/events/:id - Get a specific event by event_id
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('event_id', id)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'Event not found',
                error: error.message
            });
        }

        return res.json({
            success: true,
            event: data
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the event',
            error: err.message
        });
    }
});

// PUT /api/events/:id - Update an event
router.put('/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }
    
    try {
        // First, check if the event exists and user has permission
        const { data: existingEvent, error: fetchError } = await supabase
            .from('events')
            .select('*')
            .eq('event_id', id)
            .single();
        
        if (fetchError || !existingEvent) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        // Check if user is the creator
        if (existingEvent.created_by_user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this event'
            });
        }
        
        // Prepare update data
        const updateData = {};
        const { 
            title, 
            description, 
            location, 
            start_time, 
            end_time, 
            attendee_cap, 
            price_cents, 
            restricted_to_org 
        } = req.body;
        
        if (title !== undefined) {
            if (title.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Event title cannot be empty'
                });
            }
            updateData.title = title.trim();
        }
        
        if (description !== undefined) {
            updateData.description = description ? description.trim() : null;
        }
        
        if (location !== undefined) {
            updateData.location = location ? location.trim() : null;
        }
        
        if (start_time !== undefined) {
            updateData.start_time = start_time;
        }
        
        if (end_time !== undefined) {
            updateData.end_time = end_time;
        }
        
        // Validate that end_time is after start_time if both are being updated
        if (updateData.start_time && updateData.end_time) {
            const startDate = new Date(updateData.start_time);
            const endDate = new Date(updateData.end_time);
            if (endDate <= startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }
        } else if (updateData.start_time && existingEvent.end_time) {
            const startDate = new Date(updateData.start_time);
            const endDate = new Date(existingEvent.end_time);
            if (endDate <= startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }
        } else if (updateData.end_time && existingEvent.start_time) {
            const startDate = new Date(existingEvent.start_time);
            const endDate = new Date(updateData.end_time);
            if (endDate <= startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }
        }
        
        if (attendee_cap !== undefined) {
            updateData.attendee_cap = attendee_cap ? parseInt(attendee_cap) : null;
        }
        
        if (price_cents !== undefined) {
            updateData.price_cents = price_cents ? parseInt(price_cents) : null;
        }
        
        if (restricted_to_org !== undefined) {
            updateData.restricted_to_org = Boolean(restricted_to_org);
        }
        
        // Update the event
        const { data: updatedEvent, error: updateError } = await supabase
            .from('events')
            .update(updateData)
            .eq('event_id', id)
            .select()
            .single();
        
        if (updateError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to update event',
                error: updateError.message
            });
        }
        
        return res.json({
            success: true,
            message: 'Event updated successfully',
            event: updatedEvent
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the event',
            error: err.message
        });
    }
});

// DELETE /api/events/:id - Delete an event
router.delete('/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }
    
    try {
        // First, check if the event exists and user has permission
        const { data: existingEvent, error: fetchError } = await supabase
            .from('events')
            .select('created_by_user_id')
            .eq('event_id', id)
            .single();
        
        if (fetchError || !existingEvent) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        // Check if user is the creator
        if (existingEvent.created_by_user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this event'
            });
        }
        
        // Delete the event
        const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .eq('event_id', id);
        
        if (deleteError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to delete event',
                error: deleteError.message
            });
        }
        
        return res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the event',
            error: err.message
        });
    }
});

// POST /api/events/:id/rsvp - Create or update an RSVP for an event
router.post('/:id/rsvp', authenticateUser, async (req, res) => {
    console.log('=== POST /api/events/:id/rsvp called ===');
    console.log('Event ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('User from req.user:', req.user);
    
    const { id } = req.params;
    const { status } = req.body;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }
    
    // Validate status - map frontend values to database values
    // Database allows: 'pending', 'confirmed', 'cancelled'
    const statusMap = {
        'going': 'confirmed',
        'maybe': 'pending',
        'not_going': 'cancelled'
    };
    
    const validStatuses = ['going', 'not_going', 'maybe'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Valid status is required. Must be one of: going, not_going, maybe'
        });
    }
    
    // Map to database format: 'pending', 'confirmed', 'cancelled'
    const dbStatus = statusMap[status];
    
    try {
        // First, get the event to check organization and attendee cap
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('event_id', id)
            .single();
        
        if (eventError || !event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        // Check if event has an organization
        if (!event.created_by_org_id) {
            return res.status(400).json({
                success: false,
                message: 'This event is not associated with an organization'
            });
        }
        
        // Check if user is a member of the organization
        const { data: membership, error: membershipError } = await supabase
            .from('organization_memberships')
            .select('*')
            .eq('user_id', user_id)
            .eq('org_id', event.created_by_org_id)
            .single();
        
        // PGRST116 is the "not found" error code from Supabase
        if (membershipError && membershipError.code !== 'PGRST116') {
            console.error('Error checking membership:', membershipError);
            return res.status(400).json({
                success: false,
                message: 'Failed to check membership',
                error: membershipError.message
            });
        }
        
        if (!membership) {
            return res.status(403).json({
                success: false,
                message: 'You must be a member of the organization to RSVP to this event'
            });
        }
        
        // Check if RSVP already exists
        const { data: existingRsvp, error: checkError } = await supabase
            .from('event_rsvps')
            .select('*')
            .eq('event_id', id)
            .eq('user_id', user_id)
            .single();
        
        // PGRST116 is the "not found" error code from Supabase - this is expected if no RSVP exists
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing RSVP:', checkError);
            return res.status(400).json({
                success: false,
                message: 'Failed to check existing RSVP',
                error: checkError.message
            });
        }
        
        // If status is 'going' (which maps to 'confirmed'), check attendee cap
        if (status === 'going' && event.attendee_cap) {
            // Count current 'confirmed' RSVPs (using database format)
            const { count, error: countError } = await supabase
                .from('event_rsvps')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', id)
                .eq('status', 'confirmed');
            
            if (countError) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to check attendee count',
                    error: countError.message
                });
            }
            
            // If user already has a 'confirmed' RSVP, they're already counted, so no need to check cap
            // Only check cap if user is changing from a different status to 'going' or creating new RSVP
            const isAlreadyConfirmed = existingRsvp && existingRsvp.status === 'confirmed';
            
            if (!isAlreadyConfirmed && (count || 0) >= event.attendee_cap) {
                return res.status(400).json({
                    success: false,
                    message: 'Event has reached its attendee capacity'
                });
            }
        }
        
        if (existingRsvp) {
            // Update existing RSVP
            const { data: updatedRsvp, error: updateError } = await supabase
                .from('event_rsvps')
                .update({
                    status: dbStatus,
                    rsvp_time: new Date().toISOString()
                })
                .eq('rsvp_id', existingRsvp.rsvp_id)
                .select()
                .single();
            
            if (updateError) {
                console.error('Error updating RSVP:', updateError);
                return res.status(400).json({
                    success: false,
                    message: 'Failed to update RSVP',
                    error: updateError.message
                });
            }
            
            console.log('RSVP updated successfully:', updatedRsvp);
            
            // Normalize status value for frontend
            const statusMap = {
                'confirmed': 'going',
                'pending': 'maybe',
                'cancelled': 'not_going'
            };
            const normalizedRsvp = {
                ...updatedRsvp,
                status: statusMap[updatedRsvp.status] || updatedRsvp.status
            };
            
            return res.json({
                success: true,
                message: 'RSVP updated successfully',
                rsvp: normalizedRsvp
            });
        } else {
            // Create new RSVP
            const { data: newRsvp, error: insertError } = await supabase
                .from('event_rsvps')
                .insert({
                    event_id: parseInt(id),
                    user_id: user_id,
                    status: dbStatus,
                    rsvp_time: new Date().toISOString()
                })
                .select()
                .single();
            
            if (insertError) {
                console.error('Error creating RSVP:', insertError);
                return res.status(400).json({
                    success: false,
                    message: 'Failed to create RSVP',
                    error: insertError.message
                });
            }
            
            console.log('RSVP created successfully:', newRsvp);
            
            // Normalize status value for frontend
            const statusMap = {
                'confirmed': 'going',
                'pending': 'maybe',
                'cancelled': 'not_going'
            };
            const normalizedRsvp = {
                ...newRsvp,
                status: statusMap[newRsvp.status] || newRsvp.status
            };
            
            return res.status(201).json({
                success: true,
                message: 'RSVP created successfully',
                rsvp: normalizedRsvp
            });
        }
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing the RSVP',
            error: err.message
        });
    }
});

// GET /api/events/:id/rsvps - Get all RSVPs for an event
router.get('/:id/rsvps', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }
    
    try {
        // First, get the event to check organization
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('created_by_org_id')
            .eq('event_id', id)
            .single();
        
        if (eventError || !event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        // Check if event has an organization
        if (!event.created_by_org_id) {
            return res.status(400).json({
                success: false,
                message: 'This event is not associated with an organization'
            });
        }
        
        // Check if user is a member of the organization
        const { data: membership, error: membershipError } = await supabase
            .from('organization_memberships')
            .select('*')
            .eq('user_id', user_id)
            .eq('org_id', event.created_by_org_id)
            .single();
        
        if (membershipError || !membership) {
            return res.status(403).json({
                success: false,
                message: 'You must be a member of the organization to view RSVPs for this event'
            });
        }
        
        // Get all RSVPs for the event
        const { data: rsvps, error: rsvpError } = await supabase
            .from('event_rsvps')
            .select('*')
            .eq('event_id', id)
            .order('rsvp_time', { ascending: false });
        
        if (rsvpError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to fetch RSVPs',
                error: rsvpError.message
            });
        }
        
        // Normalize status values for frontend (convert database format to frontend format)
        const normalizedRsvps = (rsvps || []).map(rsvp => {
            // Map database values to frontend values
            const statusMap = {
                'confirmed': 'going',
                'pending': 'maybe',
                'cancelled': 'not_going'
            };
            return {
                ...rsvp,
                status: statusMap[rsvp.status] || rsvp.status
            };
        });
        
        return res.json({
            success: true,
            rsvps: normalizedRsvps
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching RSVPs',
            error: err.message
        });
    }
});

// GET /api/events/:id/rsvp - Get the current user's RSVP for an event
router.get('/:id/rsvp', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }
    
    try {
        // Get the user's RSVP for this event
        const { data: rsvp, error: rsvpError } = await supabase
            .from('event_rsvps')
            .select('*')
            .eq('event_id', id)
            .eq('user_id', user_id)
            .single();
        
        if (rsvpError && rsvpError.code !== 'PGRST116') { // PGRST116 is "not found" error
            return res.status(400).json({
                success: false,
                message: 'Failed to fetch RSVP',
                error: rsvpError.message
            });
        }
        
        // Normalize status value for frontend (convert database format to frontend format)
        let normalizedRsvp = null;
        if (rsvp) {
            // Map database values to frontend values
            const statusMap = {
                'confirmed': 'going',
                'pending': 'maybe',
                'cancelled': 'not_going'
            };
            normalizedRsvp = {
                ...rsvp,
                status: statusMap[rsvp.status] || rsvp.status
            };
        }
        
        return res.json({
            success: true,
            rsvp: normalizedRsvp
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching RSVP',
            error: err.message
        });
    }
});

// DELETE /api/events/:id/rsvp - Cancel/delete an RSVP
router.delete('/:id/rsvp', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated'
        });
    }
    
    try {
        // Check if RSVP exists
        const { data: rsvp, error: rsvpError } = await supabase
            .from('event_rsvps')
            .select('*')
            .eq('event_id', id)
            .eq('user_id', user_id)
            .single();
        
        if (rsvpError || !rsvp) {
            return res.status(404).json({
                success: false,
                message: 'RSVP not found'
            });
        }
        
        // Delete the RSVP
        const { error: deleteError } = await supabase
            .from('event_rsvps')
            .delete()
            .eq('rsvp_id', rsvp.rsvp_id);
        
        if (deleteError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to delete RSVP',
                error: deleteError.message
            });
        }
        
        return res.json({
            success: true,
            message: 'RSVP cancelled successfully'
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred while cancelling the RSVP',
            error: err.message
        });
    }
});

module.exports = router;

